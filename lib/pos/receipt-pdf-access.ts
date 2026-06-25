import { readStoredDocumentArchivePdf } from "@/lib/document-archive/storage/storage"
import { isDocumentArchivePdfReadable } from "@/lib/document-archive/readiness"
import {
  ReceiptLookupError,
  ReceiptLookupErrorCodes,
} from "@/lib/pos/receipt-lookup-errors"
import type { PrismaClient } from "@/generated/prisma/client"

type ReceiptPdfAccessDb = Pick<PrismaClient, "receipt">

export type ReceiptPdfAccessRow = {
  receiptNo: string
  branchId: string
  pdfPath: string
  pdfBlobUrl: string | null
}

export async function loadReceiptPdfAccessRow(
  db: ReceiptPdfAccessDb,
  receiptId: string
): Promise<ReceiptPdfAccessRow | null> {
  const receipt = await db.receipt.findUnique({
    where: { id: receiptId },
    select: {
      receiptNo: true,
      branchId: true,
      documentArchive: {
        select: {
          status: true,
          pdfPath: true,
          pdfBlobUrl: true,
        },
      },
    },
  })

  if (!receipt?.documentArchive) return null

  const archive = receipt.documentArchive
  if (!isDocumentArchivePdfReadable(archive)) {
    return null
  }

  const pdfPath = String(archive.pdfPath ?? "").trim()
  if (!pdfPath) return null

  return {
    receiptNo: receipt.receiptNo,
    branchId: receipt.branchId,
    pdfPath,
    pdfBlobUrl: archive.pdfBlobUrl ?? null,
  }
}

export function assertReceiptPdfBranchAccess(
  row: ReceiptPdfAccessRow,
  branchId: string
): void {
  if (row.branchId.trim() !== branchId.trim()) {
    throw new ReceiptLookupError(
      "Receipt not found for this branch",
      ReceiptLookupErrorCodes.BRANCH_MISMATCH,
      404
    )
  }
}

export async function readReceiptArchivePdfBuffer(
  row: ReceiptPdfAccessRow
): Promise<Buffer> {
  return readStoredDocumentArchivePdf({
    pdfPath: row.pdfPath,
    pdfBlobUrl: row.pdfBlobUrl,
  })
}

export function safeReceiptPdfFileName(
  receiptNo: string,
  receiptId: string
): string {
  const base = String(receiptNo || receiptId).replace(/[^\w.-]+/g, "_")
  return `${base}.pdf`
}
