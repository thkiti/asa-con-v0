import type {
  DocumentArchiveKind,
  DocumentKind,
  PrismaClient,
} from "@/generated/prisma/client"
import { buildDocumentArchiveRefKey } from "./kinds"
import type { ArchiveRequirementPolicy } from "./kinds"
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
>

function metadataFromArchiveRow(
  row: ActiveArchiveDownloadRow | null | undefined
): Pick<
  DocumentArchiveStatusPayload,
  "archiveId" | "fileName" | "mimeType" | "sizeBytes" | "archivedAt"
> {
  if (!row || !isActiveArchiveDownloadRow(row)) {
    return {
      archiveId: null,
      fileName: null,
      mimeType: null,
      sizeBytes: null,
      archivedAt: null,
    }
  }
  return {
    archiveId: row.id,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  }
}

export async function getDocumentArchiveStatus(
  db: DocumentArchiveStatusDb,
  query: DocumentArchiveStatusQuery
): Promise<DocumentArchiveStatusPayload> {
  const vaultByKey = await loadVaultArchivesForRefs(db, [
    {
      documentKind: query.documentKind,
      documentId: query.documentId,
      archiveKind: query.archiveKind,
    },
  ])
  const key = buildDocumentArchiveRefKey(
    query.documentKind,
    query.documentId,
    query.archiveKind
  )
  const vaultHit = vaultByKey.get(key) ?? null

  const resolved = resolveDocumentArchiveStatus(
    {
      documentKind: query.documentKind,
      documentId: query.documentId,
      documentNo: query.documentNo,
      archiveKind: query.archiveKind,
      workflowStatus: query.workflowStatus,
      requiredPolicy: query.requiredPolicy,
      legacyPdfPath: query.legacyPdfPath,
      legacyPdfBlobUrl: query.legacyPdfBlobUrl,
    },
    vaultHit
  )

  let metadata = metadataFromArchiveRow(null)
  if (vaultHit?.archiveId) {
    const row = await db.documentArchive.findFirst({
      where: {
        id: vaultHit.archiveId,
        status: "ACTIVE",
        archiveKind: query.archiveKind,
      },
      select: activeArchiveDownloadSelect,
    })
    metadata = metadataFromArchiveRow(row)
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
  "documentArchive" | "documentArchiveLink"
>

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
