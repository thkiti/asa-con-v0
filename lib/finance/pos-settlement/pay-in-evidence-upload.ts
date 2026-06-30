import { PaymentEvidenceStatus, type PrismaClient } from "@/generated/prisma/client"
import { CatalogImageError } from "@/lib/catalog-image/errors"
import { normalizeMimeType } from "@/lib/document-archive/validation"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { loadCollectorReportForSettlement } from "./post-collector-pickup"
import {
  ensurePayInEvidenceRow,
  markPayInEvidenceUploaded,
  type PayInEvidenceRecord,
} from "./pay-in-evidence"
import { uploadPayInSlipToBlob } from "./pay-in-evidence-blob-upload"
import { uploadPayInVaultEvidence } from "./pay-in-evidence-vault"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "./pos-settlement-errors"

const MAX_SLIP_BYTES = 12 * 1024 * 1024

export type UploadPayInEvidenceInput = {
  collectorReportId: string
  collectorReportIds?: string[]
  staffId: string
  fileBuffer: Buffer
  contentType?: string
  originalFilename?: string | null
  uploadedByStaffId?: string | null
  legalEntityCode: DocumentEntityCode
}

export type UploadPayInEvidenceResult = {
  evidenceId: string
  collectorReportId: string
  collectNo: string
  status: PaymentEvidenceStatus
  blobPathname: string
  blobUrl: string
  archiveId: string
  linkedCollectorReportIds: string[]
}

export type PayInEvidenceUploadDb = Pick<
  PrismaClient,
  | "posPayInEvidence"
  | "collectorReport"
  | "voucher"
  | "documentArchive"
  | "documentArchiveLink"
  | "$transaction"
>

async function resolveUploadTargets(
  db: PayInEvidenceUploadDb,
  collectorReportIds: string[]
) {
  const uniqueIds = [...new Set(collectorReportIds.map((id) => id.trim()).filter(Boolean))]
  if (uniqueIds.length === 0) {
    throw new PosSettlementError(
      "collectorReportId is required",
      PosSettlementErrorCodes.COLLECTOR_REPORT_NOT_FOUND,
      400
    )
  }

  const sources = []
  for (const collectorReportId of uniqueIds) {
    const source = await loadCollectorReportForSettlement(db, collectorReportId)
    sources.push(source)
  }
  return sources
}

export async function uploadPayInEvidenceForCollectorReport(
  db: PayInEvidenceUploadDb,
  input: UploadPayInEvidenceInput
): Promise<UploadPayInEvidenceResult> {
  const primaryId = String(input.collectorReportId ?? "").trim()
  const targetIds =
    input.collectorReportIds?.length
      ? input.collectorReportIds
      : primaryId
        ? [primaryId]
        : []

  if (input.fileBuffer.length === 0) {
    throw new PosSettlementError(
      "Upload file is empty",
      PosSettlementErrorCodes.INVALID_SOURCE,
      400
    )
  }

  if (input.fileBuffer.length > MAX_SLIP_BYTES) {
    throw new PosSettlementError(
      "File too large",
      PosSettlementErrorCodes.INVALID_SOURCE,
      400
    )
  }

  const sources = await resolveUploadTargets(db, targetIds)
  const staffId = String(input.staffId ?? "").trim()
  if (!staffId) {
    throw new PosSettlementError(
      "staffId is required for PAY-IN slip upload",
      PosSettlementErrorCodes.INVALID_SOURCE,
      400
    )
  }

  const mimeType = normalizeMimeType(
    input.originalFilename,
    input.contentType ?? "image/jpeg"
  )

  const vault = await uploadPayInVaultEvidence(db, {
    legalEntityCode: input.legalEntityCode,
    archivedByStaffId: input.uploadedByStaffId?.trim() || staffId,
    branchId: sources[0]?.branchId ?? null,
    fileBuffer: input.fileBuffer,
    fileName: input.originalFilename,
    mimeType,
    links: sources.map((source) => ({
      collectorReportId: source.id,
      collectNo: source.collectNo,
      branchId: source.branchId,
    })),
  })

  const primarySource = sources.find((source) => source.id === primaryId) ?? sources[0]!

  const evidence = await ensurePayInEvidenceRow(db, {
    collectorReportId: primarySource.id,
    collectNo: primarySource.collectNo,
    branchId: primarySource.branchId,
  })

  let uploaded: { blobPathname: string; blobUrl: string }
  try {
    uploaded = await uploadPayInSlipToBlob({
      collectNo: primarySource.collectNo,
      staffId,
      fileBuffer: input.fileBuffer,
      contentType: mimeType,
    })
  } catch (err) {
    if (err instanceof CatalogImageError) {
      uploaded = {
        blobPathname: vault.storagePath,
        blobUrl: vault.storageUrl ?? vault.storagePath,
      }
    } else {
      throw err
    }
  }

  const updated = await markPayInEvidenceUploaded(db, {
    evidenceId: evidence.id,
    blobPathname: uploaded.blobPathname,
    blobUrl: uploaded.blobUrl,
    byteSize: input.fileBuffer.length,
    mimeType,
    originalFilename:
      input.originalFilename?.trim() ||
      `${primarySource.collectNo}-${staffId}.${mimeType === "application/pdf" ? "pdf" : mimeType === "image/png" ? "png" : "jpg"}`,
    uploadedByStaffId: input.uploadedByStaffId ?? staffId,
  })

  return {
    evidenceId: updated.id,
    collectorReportId: updated.collectorReportId,
    collectNo: updated.collectNo,
    status: updated.status,
    blobPathname: uploaded.blobPathname,
    blobUrl: uploaded.blobUrl,
    archiveId: vault.archiveId,
    linkedCollectorReportIds: sources.map((source) => source.id),
  }
}

function toUploadResult(row: PayInEvidenceRecord): UploadPayInEvidenceResult {
  return {
    evidenceId: row.id,
    collectorReportId: row.collectorReportId,
    collectNo: row.collectNo,
    status: row.status,
    blobPathname: row.blobPathname!,
    blobUrl: row.blobUrl!,
    archiveId: "",
    linkedCollectorReportIds: [row.collectorReportId],
  }
}

export { toUploadResult }
