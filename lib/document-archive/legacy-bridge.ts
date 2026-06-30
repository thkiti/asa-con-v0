import type {
  DocumentArchiveKind,
  DocumentArchiveStatus,
  DocumentKind,
  Prisma,
  PrismaClient,
} from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { isManualJournalPdfReadable } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-readiness"
import { isDocumentArchiveStorageReadable } from "./readiness"
import {
  activeArchiveDownloadSelect,
  type ActiveArchiveDownloadRow,
} from "./upload-archive"

export type LegacyBridgeDb = Pick<
  PrismaClient,
  | "$transaction"
  | "documentArchive"
  | "documentArchiveLink"
  | "manualJournalEntry"
  | "receipt"
>

export type LegacyBridgeResult = {
  archiveId: string
  linkId: string
  created: boolean
}

type LegacyArchiveWritable = {
  id: string
  status: string
  archiveKind: DocumentArchiveKind
  pdfPath: string | null
  pdfBlobUrl: string | null
  storagePath: string | null
  storageUrl: string | null
  fileName: string | null
  mimeType: string
  legalEntityCode: string | null
  branchId: string | null
  generatedAt: Date | null
  archivedAt: Date | null
  documentType: "RECEIPT" | null
  documentId: string | null
  documentNo: string | null
}

function readableStoragePath(row: {
  storagePath?: string | null
  pdfPath?: string | null
}): string | null {
  const path = String(row.storagePath ?? row.pdfPath ?? "").trim()
  return path || null
}

function isBridgedArchiveReadable(
  row: Pick<
    LegacyArchiveWritable,
    "status" | "storagePath" | "pdfPath" | "storageUrl" | "pdfBlobUrl"
  >
): boolean {
  return isDocumentArchiveStorageReadable({
    status: row.status,
    storagePath: row.storagePath,
    pdfPath: row.pdfPath,
    storageUrl: row.storageUrl,
    pdfBlobUrl: row.pdfBlobUrl,
  })
}

async function findActiveLinkForDocument(
  db: Pick<PrismaClient, "documentArchiveLink">,
  input: {
    documentKind: DocumentKind
    documentId: string
    archiveKind: DocumentArchiveKind
  }
) {
  return db.documentArchiveLink.findFirst({
    where: {
      documentKind: input.documentKind,
      documentId: input.documentId,
      isActive: true,
      archive: {
        archiveKind: input.archiveKind,
        status: { in: ["ACTIVE", "READY"] as DocumentArchiveStatus[] },
      },
    },
    select: {
      id: true,
      archiveId: true,
    },
  })
}

async function normalizeLegacyArchiveRow(
  tx: Prisma.TransactionClient,
  archiveId: string,
  input: {
    archiveKind: DocumentArchiveKind
    storagePath: string
    storageUrl: string | null
    fileName?: string | null
    legalEntityCode?: string | null
    branchId?: string | null
    archivedAt?: Date | null
  }
): Promise<void> {
  await tx.documentArchive.update({
    where: { id: archiveId },
    data: {
      archiveKind: input.archiveKind,
      storagePath: input.storagePath,
      storageUrl: input.storageUrl,
      pdfPath: input.storagePath,
      pdfBlobUrl: input.storageUrl,
      status: "ACTIVE",
      fileName: input.fileName?.trim() || undefined,
      legalEntityCode: input.legalEntityCode?.trim() || undefined,
      branchId: input.branchId?.trim() || undefined,
      archivedAt: input.archivedAt ?? undefined,
      generatedAt: input.archivedAt ?? undefined,
    },
  })
}

async function createVaultLinkIfMissing(
  tx: Prisma.TransactionClient,
  input: {
    archiveId: string
    documentKind: DocumentKind
    documentId: string
    documentNo: string
    linkType?: string | null
  }
): Promise<{ linkId: string; created: boolean }> {
  const existing = await tx.documentArchiveLink.findFirst({
    where: {
      archiveId: input.archiveId,
      documentKind: input.documentKind,
      documentId: input.documentId,
      isActive: true,
    },
    select: { id: true },
  })
  if (existing) {
    return { linkId: existing.id, created: false }
  }

  const created = await tx.documentArchiveLink.create({
    data: {
      archiveId: input.archiveId,
      documentKind: input.documentKind,
      documentId: input.documentId,
      documentNo: input.documentNo,
      linkType: input.linkType ?? "PRIMARY",
    },
    select: { id: true },
  })
  return { linkId: created.id, created: true }
}

export async function ensureLegacyMjvArchiveLink(
  db: LegacyBridgeDb,
  input: {
    documentKind: "MJV" | "OPB"
    manualJournalEntryId: string
    documentNo?: string | null
    legalEntityCode?: DocumentEntityCode | null
  }
): Promise<LegacyBridgeResult | null> {
  const manualJournalEntryId = String(input.manualJournalEntryId ?? "").trim()
  if (!manualJournalEntryId) return null

  const archiveKind: DocumentArchiveKind = "DOCUMENT_PDF"
  const existingLink = await findActiveLinkForDocument(db, {
    documentKind: input.documentKind,
    documentId: manualJournalEntryId,
    archiveKind,
  })
  if (existingLink) {
    return {
      archiveId: existingLink.archiveId,
      linkId: existingLink.id,
      created: false,
    }
  }

  const entry = await db.manualJournalEntry.findFirst({
    where: {
      id: manualJournalEntryId,
      ...(input.legalEntityCode ? { legalEntityCode: input.legalEntityCode } : {}),
    },
    select: {
      id: true,
      entryNo: true,
      status: true,
      legalEntityCode: true,
      branchId: true,
      pdfPath: true,
      pdfBlobUrl: true,
      pdfGeneratedAt: true,
    },
  })
  if (!entry || entry.status !== "POSTED") {
    return null
  }
  if (
    !isManualJournalPdfReadable({
      status: entry.status,
      pdfPath: entry.pdfPath,
      pdfBlobUrl: entry.pdfBlobUrl,
    })
  ) {
    return null
  }

  const storagePath = String(entry.pdfPath ?? "").trim()
  if (!storagePath) return null

  const documentNo = String(input.documentNo ?? entry.entryNo ?? "").trim()
  if (!documentNo) return null

  return db.$transaction(async (tx) => {
    const linked = await findActiveLinkForDocument(tx, {
      documentKind: input.documentKind,
      documentId: manualJournalEntryId,
      archiveKind,
    })
    if (linked) {
      return {
        archiveId: linked.archiveId,
        linkId: linked.id,
        created: false,
      }
    }

    const archivedAt = entry.pdfGeneratedAt ?? new Date()
    const archive = await tx.documentArchive.create({
      data: {
        archiveKind,
        legalEntityCode: entry.legalEntityCode,
        branchId: entry.branchId,
        storagePath,
        storageUrl: entry.pdfBlobUrl,
        pdfPath: storagePath,
        pdfBlobUrl: entry.pdfBlobUrl,
        fileName: `${documentNo}.pdf`,
        mimeType: "application/pdf",
        status: "ACTIVE",
        archivedAt,
        generatedAt: archivedAt,
      },
      select: { id: true },
    })

    const link = await createVaultLinkIfMissing(tx, {
      archiveId: archive.id,
      documentKind: input.documentKind,
      documentId: manualJournalEntryId,
      documentNo,
      linkType: "PRIMARY",
    })

    return {
      archiveId: archive.id,
      linkId: link.linkId,
      created: link.created,
    }
  })
}

export async function ensureLegacyReceiptArchiveLink(
  db: LegacyBridgeDb,
  input: {
    receiptId: string
    documentNo?: string | null
    legalEntityCode?: DocumentEntityCode | null
  }
): Promise<LegacyBridgeResult | null> {
  const receiptId = String(input.receiptId ?? "").trim()
  if (!receiptId) return null

  const archiveKind: DocumentArchiveKind = "RECEIPT_SLIP"
  const existingLink = await findActiveLinkForDocument(db, {
    documentKind: "REC",
    documentId: receiptId,
    archiveKind,
  })
  if (existingLink) {
    return {
      archiveId: existingLink.archiveId,
      linkId: existingLink.id,
      created: false,
    }
  }

  const receipt = await db.receipt.findUnique({
    where: { id: receiptId },
    select: {
      id: true,
      receiptNo: true,
      branchId: true,
      pdfPath: true,
      pdfBlobUrl: true,
      pdfGeneratedAt: true,
      documentArchiveId: true,
      documentArchive: {
        select: {
          id: true,
          status: true,
          archiveKind: true,
          storagePath: true,
          storageUrl: true,
          pdfPath: true,
          pdfBlobUrl: true,
          fileName: true,
          mimeType: true,
          legalEntityCode: true,
          branchId: true,
          generatedAt: true,
          archivedAt: true,
          documentType: true,
          documentId: true,
          documentNo: true,
        },
      },
    },
  })
  if (!receipt) return null

  const documentNo = String(input.documentNo ?? receipt.receiptNo ?? "").trim()
  if (!documentNo) return null

  const receiptPath = String(receipt.pdfPath ?? "").trim()
  const archive = receipt.documentArchive
  const archivePath = archive ? readableStoragePath(archive) : null
  const storagePath = archivePath ?? receiptPath
  if (!storagePath) return null

  const archiveReadable = archive
    ? isBridgedArchiveReadable(archive)
    : Boolean(receiptPath)
  if (!archiveReadable) return null

  const storageUrl = archive?.storageUrl ?? archive?.pdfBlobUrl ?? receipt.pdfBlobUrl
  const archivedAt =
    archive?.archivedAt ?? archive?.generatedAt ?? receipt.pdfGeneratedAt ?? new Date()

  return db.$transaction(async (tx) => {
    const linked = await findActiveLinkForDocument(tx, {
      documentKind: "REC",
      documentId: receiptId,
      archiveKind,
    })
    if (linked) {
      return {
        archiveId: linked.archiveId,
        linkId: linked.id,
        created: false,
      }
    }

    let archiveId = receipt.documentArchiveId ?? archive?.id ?? null

    if (archiveId && archive) {
      await normalizeLegacyArchiveRow(tx, archiveId, {
        archiveKind,
        storagePath,
        storageUrl: storageUrl ?? null,
        fileName: archive.fileName ?? `${documentNo}.pdf`,
        branchId: archive.branchId ?? receipt.branchId,
        archivedAt,
      })
    } else if (archiveId) {
      await normalizeLegacyArchiveRow(tx, archiveId, {
        archiveKind,
        storagePath,
        storageUrl: storageUrl ?? null,
        fileName: `${documentNo}.pdf`,
        branchId: receipt.branchId,
        archivedAt,
      })
    } else {
      const created = await tx.documentArchive.create({
        data: {
          archiveKind,
          branchId: receipt.branchId,
          storagePath,
          storageUrl: storageUrl ?? null,
          pdfPath: storagePath,
          pdfBlobUrl: storageUrl ?? null,
          fileName: `${documentNo}.pdf`,
          mimeType: "application/pdf",
          status: "ACTIVE",
          archivedAt,
          generatedAt: archivedAt,
          documentType: "RECEIPT",
          documentId: receiptId,
          documentNo,
        },
        select: { id: true },
      })
      archiveId = created.id
      await tx.receipt.update({
        where: { id: receiptId },
        data: { documentArchiveId: archiveId },
      })
    }

    const link = await createVaultLinkIfMissing(tx, {
      archiveId,
      documentKind: "REC",
      documentId: receiptId,
      documentNo,
      linkType: "PRIMARY",
    })

    return {
      archiveId,
      linkId: link.linkId,
      created: link.created,
    }
  })
}

export async function loadLegacyMjvArchiveContext(
  db: Pick<PrismaClient, "manualJournalEntry">,
  input: {
    manualJournalEntryId: string
    legalEntityCode?: DocumentEntityCode | null
  }
) {
  const entry = await db.manualJournalEntry.findFirst({
    where: {
      id: input.manualJournalEntryId,
      ...(input.legalEntityCode ? { legalEntityCode: input.legalEntityCode } : {}),
    },
    select: {
      status: true,
      pdfPath: true,
      pdfBlobUrl: true,
      entryNo: true,
      entryType: true,
    },
  })
  if (!entry) return null
  return {
    workflowStatus: entry.status,
    legacyPdfPath: entry.pdfPath,
    legacyPdfBlobUrl: entry.pdfBlobUrl,
    documentNo: entry.entryNo,
  }
}

export async function loadLegacyReceiptArchiveContext(
  db: Pick<PrismaClient, "receipt">,
  receiptId: string
) {
  const receipt = await db.receipt.findUnique({
    where: { id: receiptId },
    select: {
      receiptNo: true,
      branchId: true,
      pdfPath: true,
      pdfBlobUrl: true,
      documentArchive: {
        select: {
          status: true,
          storagePath: true,
          storageUrl: true,
          pdfPath: true,
          pdfBlobUrl: true,
          errorMessage: true,
        },
      },
    },
  })
  if (!receipt) return null
  return {
    documentNo: receipt.receiptNo,
    branchId: receipt.branchId,
    legacyReceiptPdfPath: receipt.pdfPath,
    legacyPdfPath: receipt.pdfPath,
    legacyPdfBlobUrl: receipt.pdfBlobUrl,
    legacyDocumentArchive: receipt.documentArchive,
  }
}

export function mapArchiveRowToDownloadRow(
  row: Prisma.DocumentArchiveGetPayload<{ select: typeof activeArchiveDownloadSelect }>
): ActiveArchiveDownloadRow {
  return row
}

export async function loadLegacyPilotReceiptArchiveRow(
  db: Pick<PrismaClient, "receipt" | "documentArchive">,
  receiptId: string
): Promise<ActiveArchiveDownloadRow | null> {
  const receipt = await db.receipt.findUnique({
    where: { id: receiptId },
    select: {
      documentArchiveId: true,
      pdfPath: true,
      pdfBlobUrl: true,
      documentArchive: {
        select: activeArchiveDownloadSelect,
      },
    },
  })
  if (!receipt) return null

  const archive = receipt.documentArchive
  if (archive && isBridgedArchiveReadable(archive)) {
    return mapArchiveRowToDownloadRow(archive)
  }

  const receiptPath = String(receipt.pdfPath ?? "").trim()
  if (!receiptPath) return null

  if (archive) {
    return mapArchiveRowToDownloadRow({
      ...archive,
      status: "ACTIVE",
      storagePath: readableStoragePath(archive) ?? receiptPath,
      storageUrl: archive.storageUrl ?? archive.pdfBlobUrl ?? receipt.pdfBlobUrl,
      pdfPath: archive.pdfPath ?? receiptPath,
      pdfBlobUrl: archive.pdfBlobUrl ?? receipt.pdfBlobUrl,
    })
  }

  return {
    id: receipt.documentArchiveId ?? `legacy-receipt:${receiptId}`,
    archiveKind: "RECEIPT_SLIP",
    legalEntityCode: null,
    storagePath: receiptPath,
    storageUrl: receipt.pdfBlobUrl,
    pdfPath: receiptPath,
    pdfBlobUrl: receipt.pdfBlobUrl,
    fileName: null,
    mimeType: "application/pdf",
    sizeBytes: null,
    archivedAt: null,
    status: "ACTIVE",
  }
}
