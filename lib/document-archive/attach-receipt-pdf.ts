import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import {
  buildReceiptPdfSnapshotForReceipt,
} from "@/lib/pos/receipt-pdf-snapshot"
import { renderReceiptPdfFromSnapshot } from "@/lib/pos/receipt-pdf-render"
import type { ReceiptPdfSnapshot } from "@/lib/pos/receipt-pdf-snapshot-types"
import { buildReceiptArchivePdfPathname } from "./paths/receipt"
import {
  applyReceiptArchivePdfReady,
  markReceiptArchiveFailed,
} from "./receipt-archive-status"
import { storeDocumentArchivePdf } from "./storage/storage"

export type AttachReceiptPdfArchiveInput = {
  receiptId: string
  branchId: string
  snapshot?: ReceiptPdfSnapshot
}

export type AttachReceiptPdfArchiveResult =
  | {
      ok: true
      pdfPath: string
      pdfGeneratedAt: Date
      documentArchiveId: string
    }
  | { ok: false; error: string }

type ReceiptArchiveRow = {
  id: string
  receiptNo: string
  branchId: string
  issuedAt: Date
  pdfPath: string | null
  pdfGeneratedAt: Date | null
  documentArchiveId: string | null
  documentArchive: {
    id: string
    status: string
    pdfPath: string | null
    generatedAt: Date | null
  } | null
}

async function loadReceiptArchiveRow(
  client: Pick<Prisma.TransactionClient, "receipt">,
  receiptId: string
): Promise<ReceiptArchiveRow | null> {
  return client.receipt.findUnique({
    where: { id: receiptId },
    select: {
      id: true,
      receiptNo: true,
      branchId: true,
      issuedAt: true,
      pdfPath: true,
      pdfGeneratedAt: true,
      documentArchiveId: true,
      documentArchive: {
        select: {
          id: true,
          status: true,
          pdfPath: true,
          generatedAt: true,
        },
      },
    },
  })
}

function existingArchiveResult(row: ReceiptArchiveRow): AttachReceiptPdfArchiveResult | null {
  const pdfPath = String(row.pdfPath ?? "").trim()
  if (pdfPath && row.pdfGeneratedAt) {
    return {
      ok: true,
      pdfPath,
      pdfGeneratedAt: row.pdfGeneratedAt,
      documentArchiveId: row.documentArchiveId ?? row.documentArchive?.id ?? "",
    }
  }

  const archive = row.documentArchive
  if (
    archive?.status === "READY" &&
    String(archive.pdfPath ?? "").trim() &&
    archive.generatedAt
  ) {
    return {
      ok: true,
      pdfPath: archive.pdfPath!,
      pdfGeneratedAt: archive.generatedAt,
      documentArchiveId: archive.id,
    }
  }

  return null
}

async function ensurePendingArchiveRow(
  client: Prisma.TransactionClient,
  snapshot: ReceiptPdfSnapshot
): Promise<string> {
  const archive = await client.documentArchive.upsert({
    where: {
      documentType_documentId: {
        documentType: "RECEIPT",
        documentId: snapshot.receiptId,
      },
    },
    create: {
      documentType: "RECEIPT",
      documentId: snapshot.receiptId,
      documentNo: snapshot.receiptNo,
      branchId: snapshot.branchId,
      snapshotJson: snapshot as unknown as Prisma.InputJsonValue,
      snapshotVersion: snapshot.snapshotVersion,
      status: "PENDING",
    },
    update: {
      documentNo: snapshot.receiptNo,
      branchId: snapshot.branchId,
      snapshotJson: snapshot as unknown as Prisma.InputJsonValue,
      snapshotVersion: snapshot.snapshotVersion,
      status: "PENDING",
      errorMessage: null,
    },
    select: { id: true },
  })

  await client.receipt.update({
    where: { id: snapshot.receiptId },
    data: { documentArchiveId: archive.id },
  })

  return archive.id
}

/**
 * Render frozen snapshot, store PDF once, and persist archive + receipt pdf fields.
 * Never re-renders when pdfPath already exists.
 */
export async function attachReceiptPdfArchive(
  input: AttachReceiptPdfArchiveInput
): Promise<AttachReceiptPdfArchiveResult> {
  const receiptId = String(input.receiptId ?? "").trim()
  const branchId = String(input.branchId ?? "").trim()
  if (!receiptId) {
    return { ok: false, error: "receiptId is required" }
  }
  if (!branchId) {
    return { ok: false, error: "branchId is required" }
  }

  const existingRow = await loadReceiptArchiveRow(prisma, receiptId)
  if (!existingRow) {
    return { ok: false, error: "Receipt not found" }
  }

  const existing = existingArchiveResult(existingRow)
  if (existing) {
    return existing
  }

  let snapshot = input.snapshot
  if (!snapshot) {
    const built = await buildReceiptPdfSnapshotForReceipt(prisma, { receiptId, branchId })
    if (!built) {
      return { ok: false, error: "Receipt snapshot could not be built" }
    }
    snapshot = built
  }

  if (snapshot.receiptId !== receiptId) {
    return { ok: false, error: "Snapshot receipt id mismatch" }
  }
  if (snapshot.branchId !== branchId) {
    return { ok: false, error: "Snapshot branch id mismatch" }
  }

  let documentArchiveId: string
  try {
    documentArchiveId = await prisma.$transaction((tx) =>
      ensurePendingArchiveRow(tx, snapshot!)
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create archive row"
    console.error("RECEIPT_ARCHIVE_PENDING:", err)
    return { ok: false, error: message }
  }

  try {
    const pdfBuffer = await renderReceiptPdfFromSnapshot(snapshot)
    const relativePath = buildReceiptArchivePdfPathname(
      snapshot.receiptNo,
      new Date(snapshot.issuedAt)
    )
    const stored = await storeDocumentArchivePdf(relativePath, pdfBuffer)
    const pdfGeneratedAt = new Date()

    await prisma.$transaction((tx) =>
      applyReceiptArchivePdfReady(tx, {
        receiptId,
        documentArchiveId,
        pdfPath: stored.pdfPath,
        pdfBlobUrl: stored.pdfBlobUrl,
        pdfGeneratedAt,
      })
    )

    return {
      ok: true,
      pdfPath: stored.pdfPath,
      pdfGeneratedAt,
      documentArchiveId,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Receipt PDF generation failed"
    console.error("RECEIPT_ARCHIVE_ATTACH:", err)
    try {
      await markReceiptArchiveFailed(prisma, {
        documentArchiveId,
        errorMessage: message,
      })
    } catch (markErr: unknown) {
      console.error("RECEIPT_ARCHIVE_FAILED_MARK:", markErr)
    }
    return { ok: false, error: message }
  }
}
