import { PaymentEvidenceStatus, type PrismaClient } from "@/generated/prisma/client"
import { CatalogImageError } from "@/lib/catalog-image/errors"
import { loadCollectorReportForSettlement } from "./post-collector-pickup"
import {
  ensurePayInEvidenceRow,
  markPayInEvidenceUploaded,
  type PayInEvidenceRecord,
} from "./pay-in-evidence"
import { uploadPayInSlipToBlob } from "./pay-in-evidence-blob-upload"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "./pos-settlement-errors"

const MAX_SLIP_BYTES = 12 * 1024 * 1024

export type UploadPayInEvidenceInput = {
  collectorReportId: string
  fileBuffer: Buffer
  contentType?: string
  originalFilename?: string | null
  uploadedByStaffId?: string | null
}

export type UploadPayInEvidenceResult = {
  evidenceId: string
  collectorReportId: string
  collectNo: string
  status: PaymentEvidenceStatus
  blobPathname: string
  blobUrl: string
}

export type PayInEvidenceUploadDb = Pick<
  PrismaClient,
  "posPayInEvidence" | "collectorReport" | "voucher"
>

export async function uploadPayInEvidenceForCollectorReport(
  db: PayInEvidenceUploadDb,
  input: UploadPayInEvidenceInput
): Promise<UploadPayInEvidenceResult> {
  const collectorReportId = String(input.collectorReportId ?? "").trim()
  if (!collectorReportId) {
    throw new PosSettlementError(
      "collectorReportId is required",
      PosSettlementErrorCodes.COLLECTOR_REPORT_NOT_FOUND,
      400
    )
  }

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

  const source = await loadCollectorReportForSettlement(db, collectorReportId)
  const evidence = await ensurePayInEvidenceRow(db, {
    collectorReportId: source.id,
    collectNo: source.collectNo,
    branchId: source.branchId,
  })

  let uploaded: { blobPathname: string; blobUrl: string }
  try {
    uploaded = await uploadPayInSlipToBlob({
      collectorReportId: source.id,
      fileBuffer: input.fileBuffer,
      contentType: input.contentType,
    })
  } catch (err) {
    if (err instanceof CatalogImageError) {
      throw new PosSettlementError(err.message, PosSettlementErrorCodes.INVALID_SOURCE, err.httpStatus)
    }
    throw err
  }

  const updated = await markPayInEvidenceUploaded(db, {
    evidenceId: evidence.id,
    blobPathname: uploaded.blobPathname,
    blobUrl: uploaded.blobUrl,
    byteSize: input.fileBuffer.length,
    mimeType: input.contentType?.trim() || "image/jpeg",
    originalFilename: input.originalFilename,
    uploadedByStaffId: input.uploadedByStaffId,
  })

  return toUploadResult(updated)
}

function toUploadResult(row: PayInEvidenceRecord): UploadPayInEvidenceResult {
  return {
    evidenceId: row.id,
    collectorReportId: row.collectorReportId,
    collectNo: row.collectNo,
    status: row.status,
    blobPathname: row.blobPathname!,
    blobUrl: row.blobUrl!,
  }
}
