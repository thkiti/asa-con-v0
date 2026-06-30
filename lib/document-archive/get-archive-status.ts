import type {
  DocumentArchiveKind,
  DocumentKind,
  PrismaClient,
} from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { buildDocumentArchiveRefKey } from "./kinds"
import type { ArchiveRequirementPolicy } from "./kinds"
import {
  ensureLegacyMjvArchiveLink,
  ensureLegacyReceiptArchiveLink,
  loadLegacyMjvArchiveContext,
  loadLegacyReceiptArchiveContext,
  loadLegacyPilotReceiptArchiveRow,
  type LegacyBridgeDb,
} from "./legacy-bridge"
import {
  resolveDocumentArchiveStatus,
} from "./resolve-status"
import type {
  DocumentArchiveStatusSource,
  DocumentArchiveTriState,
} from "./resolve-status-types"
import { loadVaultArchivesForRefs } from "./vault-lookup"
import {
  activeArchiveDownloadSelect,
  isActiveArchiveDownloadRow,
  type ActiveArchiveDownloadRow,
} from "./upload-archive"
import { isDocumentArchiveStorageReadable } from "./readiness"
import {
  DocumentArchiveError,
  DocumentArchiveErrorCodes,
} from "./errors"

export type DocumentArchiveStatusQuery = {
  documentKind: DocumentKind
  documentId: string
  documentNo?: string | null
  archiveKind: DocumentArchiveKind
  workflowStatus?: string | null
  requiredPolicy?: ArchiveRequirementPolicy
  legacyPdfPath?: string | null
  legacyPdfBlobUrl?: string | null
  legacyReceiptPdfPath?: string | null
  legacyDocumentArchive?: import("./types").DocumentArchiveStorageFields | null
  branchId?: string | null
}

export type DocumentArchiveStatusPayload = {
  pdfAvailable: DocumentArchiveTriState
  archiveAvailable: DocumentArchiveTriState
  source: DocumentArchiveStatusSource
  archiveId: string | null
  fileName: string | null
  mimeType: string | null
  sizeBytes: number | null
  archivedAt: string | null
}

export type DocumentArchiveStatusDb = Pick<
  PrismaClient,
  "documentArchive" | "documentArchiveLink"
> &
  Partial<Pick<PrismaClient, "manualJournalEntry" | "receipt">>

export type DocumentArchiveStatusOptions = {
  legalEntityCode?: DocumentEntityCode | null
  /** Lazy-create vault links from legacy rows on status/download paths. */
  enableLegacyBridge?: boolean
}

function metadataFromArchiveRow(
  row: ActiveArchiveDownloadRow | null | undefined
): Pick<
  DocumentArchiveStatusPayload,
  "archiveId" | "fileName" | "mimeType" | "sizeBytes" | "archivedAt"
> {
  if (!row || !isDocumentArchiveStorageReadable(row)) {
    return {
      archiveId: null,
      fileName: null,
      mimeType: null,
      sizeBytes: null,
      archivedAt: null,
    }
  }
  return {
    archiveId: row.id.startsWith("legacy-receipt:") ? null : row.id,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  }
}

async function enrichStatusQueryFromLegacy(
  db: DocumentArchiveStatusDb,
  query: DocumentArchiveStatusQuery,
  legalEntityCode?: DocumentEntityCode | null
): Promise<DocumentArchiveStatusQuery> {
  if (query.documentKind === "REC" && db.receipt) {
    const legacy = await loadLegacyReceiptArchiveContext(
      { receipt: db.receipt },
      query.documentId
    )
    if (!legacy) return query
    return {
      ...query,
      documentNo: query.documentNo ?? legacy.documentNo,
      branchId: query.branchId ?? legacy.branchId,
      legacyReceiptPdfPath: legacy.legacyReceiptPdfPath,
      legacyPdfPath: legacy.legacyPdfPath,
      legacyPdfBlobUrl: legacy.legacyPdfBlobUrl,
      legacyDocumentArchive: legacy.legacyDocumentArchive,
    }
  }

  if (
    (query.documentKind === "MJV" || query.documentKind === "OPB") &&
    db.manualJournalEntry
  ) {
    const legacy = await loadLegacyMjvArchiveContext(
      { manualJournalEntry: db.manualJournalEntry },
      {
        manualJournalEntryId: query.documentId,
        legalEntityCode,
      }
    )
    if (!legacy) return query
    return {
      ...query,
      documentNo: query.documentNo ?? legacy.documentNo,
      workflowStatus: query.workflowStatus ?? legacy.workflowStatus,
      legacyPdfPath: legacy.legacyPdfPath,
      legacyPdfBlobUrl: legacy.legacyPdfBlobUrl,
    }
  }

  return query
}

async function maybeEnsureLegacyBridgeLink(
  db: DocumentArchiveStatusDb & Partial<LegacyBridgeDb>,
  query: DocumentArchiveStatusQuery,
  legalEntityCode?: DocumentEntityCode | null
): Promise<void> {
  if (!db.$transaction) return

  if (query.documentKind === "REC") {
    await ensureLegacyReceiptArchiveLink(db as LegacyBridgeDb, {
      receiptId: query.documentId,
      documentNo: query.documentNo,
      legalEntityCode,
    })
    return
  }

  if (query.documentKind === "MJV" || query.documentKind === "OPB") {
    await ensureLegacyMjvArchiveLink(db as LegacyBridgeDb, {
      documentKind: query.documentKind,
      manualJournalEntryId: query.documentId,
      documentNo: query.documentNo,
      legalEntityCode,
    })
  }
}

export async function getDocumentArchiveStatus(
  db: DocumentArchiveStatusDb & Partial<LegacyBridgeDb>,
  query: DocumentArchiveStatusQuery,
  options?: DocumentArchiveStatusOptions
): Promise<DocumentArchiveStatusPayload> {
  const enableLegacyBridge = options?.enableLegacyBridge !== false
  let enrichedQuery = await enrichStatusQueryFromLegacy(
    db,
    query,
    options?.legalEntityCode
  )

  if (enableLegacyBridge) {
    await maybeEnsureLegacyBridgeLink(db, enrichedQuery, options?.legalEntityCode)
  }

  const vaultByKey = await loadVaultArchivesForRefs(db, [
    {
      documentKind: enrichedQuery.documentKind,
      documentId: enrichedQuery.documentId,
      archiveKind: enrichedQuery.archiveKind,
    },
  ])
  const key = buildDocumentArchiveRefKey(
    enrichedQuery.documentKind,
    enrichedQuery.documentId,
    enrichedQuery.archiveKind
  )
  const vaultHit = vaultByKey.get(key) ?? null

  const resolved = resolveDocumentArchiveStatus(
    {
      documentKind: enrichedQuery.documentKind,
      documentId: enrichedQuery.documentId,
      documentNo: enrichedQuery.documentNo,
      archiveKind: enrichedQuery.archiveKind,
      workflowStatus: enrichedQuery.workflowStatus,
      requiredPolicy: enrichedQuery.requiredPolicy,
      legacyPdfPath: enrichedQuery.legacyPdfPath,
      legacyPdfBlobUrl: enrichedQuery.legacyPdfBlobUrl,
      legacyReceiptPdfPath: enrichedQuery.legacyReceiptPdfPath,
      legacyDocumentArchive: enrichedQuery.legacyDocumentArchive,
    },
    vaultHit
  )

  let metadata = metadataFromArchiveRow(null)
  if (vaultHit?.archiveId) {
    const row = await db.documentArchive.findFirst({
      where: {
        id: vaultHit.archiveId,
        status: "ACTIVE",
        archiveKind: enrichedQuery.archiveKind,
      },
      select: activeArchiveDownloadSelect,
    })
    metadata = metadataFromArchiveRow(row)
  } else if (
    resolved.pdfAvailable &&
    enrichedQuery.documentKind === "REC" &&
    db.receipt
  ) {
    metadata = metadataFromArchiveRow(
      await loadLegacyPilotReceiptArchiveRow(
        db as Pick<PrismaClient, "receipt" | "documentArchive">,
        enrichedQuery.documentId
      )
    )
  }

  return {
    pdfAvailable: resolved.pdfAvailable,
    archiveAvailable: resolved.archiveAvailable,
    source: resolved.source,
    ...metadata,
  }
}

export type DocumentArchiveDownloadDb = Pick<
  PrismaClient,
  "documentArchive" | "documentArchiveLink" | "receipt" | "manualJournalEntry"
> &
  Partial<LegacyBridgeDb>

export async function loadActiveArchiveById(
  db: DocumentArchiveDownloadDb,
  archiveId: string,
  legalEntityCode?: string | null
): Promise<ActiveArchiveDownloadRow | null> {
  const row = await db.documentArchive.findFirst({
    where: {
      id: archiveId,
      ...(legalEntityCode ? { legalEntityCode } : {}),
    },
    select: activeArchiveDownloadSelect,
  })
  if (!row || !isActiveArchiveDownloadRow(row)) {
    return null
  }
  if (!isDocumentArchiveStorageReadable(row)) {
    return null
  }
  return row
}

export async function loadActiveArchiveByDocumentRef(
  db: DocumentArchiveDownloadDb,
  input: {
    documentKind: DocumentKind
    documentId: string
    archiveKind: DocumentArchiveKind
    legalEntityCode?: string | null
  }
): Promise<ActiveArchiveDownloadRow | null> {
  const links = await db.documentArchiveLink.findMany({
    where: {
      documentKind: input.documentKind,
      documentId: input.documentId,
      isActive: true,
      archive: {
        status: "ACTIVE",
        archiveKind: input.archiveKind,
        ...(input.legalEntityCode ? { legalEntityCode: input.legalEntityCode } : {}),
      },
    },
    select: {
      archive: { select: activeArchiveDownloadSelect },
    },
  })

  const readable = links
    .map((link) => link.archive)
    .filter(
      (archive): archive is ActiveArchiveDownloadRow =>
        Boolean(archive) &&
        isActiveArchiveDownloadRow(archive) &&
        isDocumentArchiveStorageReadable(archive)
    )

  if (!readable.length) {
    return null
  }
  if (readable.length > 1) {
    const uniqueIds = new Set(readable.map((row) => row.id))
    if (uniqueIds.size > 1) {
      throw new DocumentArchiveError(
        "Multiple active archives match this document reference",
        DocumentArchiveErrorCodes.AMBIGUOUS_ARCHIVE,
        409
      )
    }
  }

  return readable[0] ?? null
}

export async function loadActiveArchiveByDocumentRefWithBridge(
  db: DocumentArchiveDownloadDb,
  input: {
    documentKind: DocumentKind
    documentId: string
    archiveKind: DocumentArchiveKind
    legalEntityCode?: DocumentEntityCode | null
    documentNo?: string | null
  }
): Promise<ActiveArchiveDownloadRow | null> {
  let row = await loadActiveArchiveByDocumentRef(db, input)
  if (row) return row

  if (db.$transaction) {
    if (input.documentKind === "REC") {
      await ensureLegacyReceiptArchiveLink(db as LegacyBridgeDb, {
        receiptId: input.documentId,
        documentNo: input.documentNo,
        legalEntityCode: input.legalEntityCode,
      })
    } else if (input.documentKind === "MJV" || input.documentKind === "OPB") {
      await ensureLegacyMjvArchiveLink(db as LegacyBridgeDb, {
        documentKind: input.documentKind,
        manualJournalEntryId: input.documentId,
        documentNo: input.documentNo,
        legalEntityCode: input.legalEntityCode,
      })
    }

    row = await loadActiveArchiveByDocumentRef(db, input)
    if (row) return row
  }

  if (input.documentKind === "REC") {
    return loadLegacyPilotReceiptArchiveRow(db, input.documentId)
  }

  return null
}

export function safeArchiveDownloadFileName(
  row: Pick<ActiveArchiveDownloadRow, "fileName" | "storagePath" | "pdfPath" | "mimeType" | "id">
): string {
  const fromRow = String(row.fileName ?? "").trim()
  if (fromRow && !fromRow.includes("/") && !fromRow.includes("\\")) {
    return fromRow
  }
  const path = String(row.storagePath ?? row.pdfPath ?? "").trim()
  const leaf = path.split("/").pop()
  if (leaf) return leaf
  const ext =
    row.mimeType === "image/png"
      ? "png"
      : row.mimeType === "image/jpeg"
        ? "jpg"
        : "pdf"
  return `archive-${row.id}.${ext}`
}
