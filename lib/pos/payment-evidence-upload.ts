import {
  PaymentEvidenceStatus,
  PaymentMethod,
  SaleStatus,
  type PrismaClient,
} from "@/generated/prisma/client"
import { CatalogImageError } from "@/lib/catalog-image/errors"
import { PosLookupError } from "./pos-errors"
import { markPaymentEvidenceUploaded } from "./payment-evidence"
import { uploadPaymentSlipToBlob } from "./payment-slip-blob-upload"

const MAX_SLIP_BYTES = 12 * 1024 * 1024

export type UploadPaymentEvidenceInput = {
  branchId: string
  branchCode: string
  receiptNo: string
  fileBuffer: Buffer
  contentType?: string
}

export type UploadPaymentEvidenceResult = {
  evidenceId: string
  receiptNo: string
  status: PaymentEvidenceStatus
  blobPathname: string
  blobUrl: string
}

export type PaymentEvidenceUploadDb = Pick<
  PrismaClient,
  "receipt" | "paymentEvidence"
>

export async function uploadPaymentEvidenceForReceipt(
  db: PaymentEvidenceUploadDb,
  input: UploadPaymentEvidenceInput
): Promise<UploadPaymentEvidenceResult> {
  const branchId = String(input.branchId ?? "").trim()
  const branchCode = String(input.branchCode ?? "").trim()
  const receiptNo = String(input.receiptNo ?? "").trim().toUpperCase()

  if (!branchId || !branchCode || !receiptNo) {
    throw new PosLookupError(
      "branchId, branchCode, and receiptNo are required",
      "INVALID_INPUT",
      400
    )
  }

  if (input.fileBuffer.length === 0) {
    throw new PosLookupError("Upload file is empty", "EMPTY_FILE", 400)
  }

  if (input.fileBuffer.length > MAX_SLIP_BYTES) {
    throw new PosLookupError("File too large", "FILE_TOO_LARGE", 400)
  }

  const receipt = await db.receipt.findFirst({
    where: {
      branchId,
      receiptNo,
      sale: { status: SaleStatus.COMPLETED },
    },
    include: {
      paymentEvidence: true,
      sale: { include: { payment: true } },
    },
  })

  if (!receipt?.sale?.payment) {
    throw new PosLookupError("Sale receipt not found", "SALE_NOT_FOUND", 404)
  }

  if (receipt.sale.payment.method !== PaymentMethod.BANK_TRANSFER) {
    throw new PosLookupError(
      "Payment evidence upload applies to bank transfer sales only",
      "NOT_BANK_TRANSFER",
      400
    )
  }

  if (!receipt.paymentEvidence) {
    throw new PosLookupError("Payment evidence not found", "EVIDENCE_NOT_FOUND", 404)
  }

  if (receipt.paymentEvidence.status === PaymentEvidenceStatus.UPLOADED) {
    throw new PosLookupError(
      "Payment evidence already uploaded",
      "EVIDENCE_ALREADY_UPLOADED",
      409
    )
  }

  let uploaded: { blobPathname: string; blobUrl: string }
  try {
    uploaded = await uploadPaymentSlipToBlob({
      branchCode,
      receiptNo,
      fileBuffer: input.fileBuffer,
      contentType: input.contentType,
    })
  } catch (err) {
    if (err instanceof CatalogImageError) {
      throw new PosLookupError(err.message, err.code, err.httpStatus)
    }
    throw err
  }

  const updated = await markPaymentEvidenceUploaded(db, {
    evidenceId: receipt.paymentEvidence.id,
    blobPathname: uploaded.blobPathname,
    blobUrl: uploaded.blobUrl,
    byteSize: input.fileBuffer.length,
    mimeType: input.contentType?.trim() || "image/jpeg",
  })

  return {
    evidenceId: updated.id,
    receiptNo: updated.receiptNo,
    status: updated.status,
    blobPathname: updated.blobPathname!,
    blobUrl: updated.blobUrl!,
  }
}
