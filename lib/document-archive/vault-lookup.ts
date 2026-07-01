import type { PrismaClient } from "@/generated/prisma/client"
import { buildDocumentArchiveRefKey } from "./kinds"
import { isPrismaTableMissingError } from "./prisma-errors"
import { isDocumentArchiveStorageReadable } from "./readiness"
import type {
  DocumentArchiveStatusInput,
  VaultArchiveRecord,
} from "./resolve-status-types"

export type VaultArchiveLookupPrisma = Pick<PrismaClient, "documentArchiveLink">

type DocumentRef = Pick<
  DocumentArchiveStatusInput,
  "documentKind" | "documentId" | "archiveKind"
>

function toVaultArchiveRecord(archive: {
  id: string
  archiveKind: VaultArchiveRecord["archiveKind"]
  status: string
  storagePath: string | null
  storageUrl: string | null
  pdfPath: string | null
  pdfBlobUrl: string | null
  mimeType: string
}): VaultArchiveRecord {
  return {
    archiveId: archive.id,
    archiveKind: archive.archiveKind,
    status: archive.status,
    storagePath: archive.storagePath,
    storageUrl: archive.storageUrl,
    pdfPath: archive.pdfPath,
    pdfBlobUrl: archive.pdfBlobUrl,
    mimeType: archive.mimeType,
  }
}

export function isVaultArchiveRecordReadable(
  record: VaultArchiveRecord | null | undefined
): boolean {
  if (!record) return false
  return isDocumentArchiveStorageReadable(record)
}

/**
 * Batch-load active vault links joined to ACTIVE archives for many document refs.
 * Map key: `documentKind:documentId:archiveKind`.
 */
export async function loadVaultArchivesForRefs(
  prisma: VaultArchiveLookupPrisma,
  refs: DocumentRef[]
): Promise<Map<string, VaultArchiveRecord>> {
  const requestedKeys = new Set(
    refs.map((ref) =>
      buildDocumentArchiveRefKey(ref.documentKind, ref.documentId, ref.archiveKind)
    )
  )
  if (!requestedKeys.size) {
    return new Map()
  }

  if (!prisma?.documentArchiveLink) {
    return new Map()
  }

  const documentIds = [...new Set(refs.map((ref) => ref.documentId.trim()).filter(Boolean))]
  const documentKinds = [...new Set(refs.map((ref) => ref.documentKind))]

  let links: Array<{
    documentKind: string
    documentId: string
    archive: {
      id: string
      archiveKind: VaultArchiveRecord["archiveKind"]
      status: string
      storagePath: string | null
      storageUrl: string | null
      pdfPath: string | null
      pdfBlobUrl: string | null
      mimeType: string
    }
  }>

  try {
    links = await prisma.documentArchiveLink.findMany({
      where: {
        isActive: true,
        documentKind: { in: documentKinds },
        documentId: { in: documentIds },
        archive: {
          status: "ACTIVE",
        },
      },
      select: {
        documentKind: true,
        documentId: true,
        archive: {
          select: {
            id: true,
            archiveKind: true,
            status: true,
            storagePath: true,
            storageUrl: true,
            pdfPath: true,
            pdfBlobUrl: true,
            mimeType: true,
          },
        },
      },
    })
  } catch (error) {
    if (isPrismaTableMissingError(error)) {
      return new Map()
    }
    throw error
  }

  const result = new Map<string, VaultArchiveRecord>()
  for (const link of links) {
    const key = buildDocumentArchiveRefKey(
      link.documentKind,
      link.documentId,
      link.archive.archiveKind
    )
    if (!requestedKeys.has(key)) continue

    const record = toVaultArchiveRecord(link.archive)
    if (!isVaultArchiveRecordReadable(record)) continue

    result.set(key, record)
  }

  return result
}
