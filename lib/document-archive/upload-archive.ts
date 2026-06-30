import { createHash } from "crypto"
import type {
  DocumentArchiveKind,
  DocumentArchiveStatus,
  Prisma,
  PrismaClient,
} from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { buildVaultArchiveStoragePathname } from "./paths/vault"
import { storeDocumentArchiveFile } from "./storage/store-archive-file"
import {
  assertArchiveFileSize,
  assertClientArchiveStatusNotRejected,
  assertMimeTypeAllowedForArchiveKind,
  normalizeMimeType,
  type DocumentArchiveLinkInput,
} from "./validation"

export type UploadDocumentArchiveInput = {
  archiveKind: DocumentArchiveKind
  legalEntityCode: DocumentEntityCode
  branchId?: string | null
  archiveNo?: string | null
  referenceNo?: string | null
  archivedByStaffId: string
  fileBuffer: Buffer
  fileName?: string | null
  mimeType?: string | null
  links: DocumentArchiveLinkInput[]
  clientStatus?: string | null
}

export type UploadDocumentArchiveResult = {
  archiveId: string
  archiveKind: DocumentArchiveKind
  storagePath: string
  storageUrl: string | null
  fileName: string
  mimeType: string
  sizeBytes: number
  checksum: string
  archivedAt: string
  linkIds: string[]
}

export type UploadDocumentArchiveDb = Pick<
  PrismaClient,
  "$transaction" | "documentArchive" | "documentArchiveLink"
>

function safeDownloadFileName(
  fileName: string | null | undefined,
  storagePath: string,
  mimeType: string
): string {
  const fromInput = String(fileName ?? "").trim()
  if (fromInput && !fromInput.includes("/") && !fromInput.includes("\\")) {
    return fromInput
  }
  const leaf = storagePath.split("/").pop() ?? "archive"
  if (leaf.includes(".")) return leaf
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "pdf"
  return `${leaf}.${ext}`
}

export async function uploadDocumentArchive(
  db: UploadDocumentArchiveDb,
  input: UploadDocumentArchiveInput
): Promise<UploadDocumentArchiveResult> {
  assertClientArchiveStatusNotRejected(input.clientStatus)
  assertArchiveFileSize(input.fileBuffer)

  const mimeType = normalizeMimeType(input.fileName, input.mimeType)
  assertMimeTypeAllowedForArchiveKind(input.archiveKind, mimeType)

  const archivedAt = new Date()
  const storagePath = buildVaultArchiveStoragePathname({
    archiveKind: input.archiveKind,
    legalEntityCode: input.legalEntityCode,
    mimeType,
    archivedAt,
  })
  const stored = await storeDocumentArchiveFile(storagePath, input.fileBuffer, mimeType)
  const checksum = createHash("sha256").update(input.fileBuffer).digest("hex")
  const fileName = safeDownloadFileName(input.fileName, stored.storagePath, mimeType)
  const sizeBytes = input.fileBuffer.length

  const archive = await db.$transaction(async (tx) => {
    const row = await tx.documentArchive.create({
      data: {
        archiveKind: input.archiveKind,
        legalEntityCode: input.legalEntityCode,
        branchId: input.branchId?.trim() || null,
        archiveNo: input.archiveNo?.trim() || null,
        referenceNo: input.referenceNo?.trim() || null,
        storagePath: stored.storagePath,
        storageUrl: stored.storageUrl,
        fileName,
        mimeType,
        sizeBytes,
        checksum,
        status: "ACTIVE",
        archivedAt,
        archivedByStaffId: input.archivedByStaffId,
        pdfPath: stored.storagePath,
        pdfBlobUrl: stored.storageUrl,
        generatedAt: archivedAt,
      },
      select: { id: true },
    })

    const linkIds: string[] = []
    for (const link of input.links) {
      const created = await tx.documentArchiveLink.create({
        data: {
          archiveId: row.id,
          documentKind: link.documentKind,
          documentId: link.documentId,
          documentNo: link.documentNo,
          linkType: link.linkType ?? null,
        },
        select: { id: true },
      })
      linkIds.push(created.id)
    }

    return { archiveId: row.id, linkIds }
  })

  return {
    archiveId: archive.archiveId,
    archiveKind: input.archiveKind,
    storagePath: stored.storagePath,
    storageUrl: stored.storageUrl,
    fileName,
    mimeType,
    sizeBytes,
    checksum,
    archivedAt: archivedAt.toISOString(),
    linkIds: archive.linkIds,
  }
}

export type ActiveArchiveDownloadRow = {
  id: string
  archiveKind: DocumentArchiveKind
  legalEntityCode: string | null
  storagePath: string | null
  storageUrl: string | null
  pdfPath: string | null
  pdfBlobUrl: string | null
  fileName: string | null
  mimeType: string
  sizeBytes: number | null
  archivedAt: Date | null
  status: DocumentArchiveStatus
}

export const activeArchiveDownloadSelect = {
  id: true,
  archiveKind: true,
  legalEntityCode: true,
  storagePath: true,
  storageUrl: true,
  pdfPath: true,
  pdfBlobUrl: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  archivedAt: true,
  status: true,
} satisfies Prisma.DocumentArchiveSelect

export function isActiveArchiveDownloadRow(
  row: Pick<ActiveArchiveDownloadRow, "status">
): boolean {
  return row.status === "ACTIVE"
}
