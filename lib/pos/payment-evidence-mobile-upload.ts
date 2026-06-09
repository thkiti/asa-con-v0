import type { PrismaClient } from "@/generated/prisma/client"
import { uploadPaymentEvidenceForReceipt } from "@/lib/pos/payment-evidence-upload"
import type { UploadPaymentEvidenceResult } from "@/lib/pos/payment-evidence-upload"
import { resolvePaymentEvidenceUploadFromToken } from "@/lib/pos/payment-evidence-upload-token"

export type PaymentEvidenceMobileUploadDb = Pick<
  PrismaClient,
  "paymentEvidence" | "branch" | "receipt"
>

export async function uploadPaymentEvidenceWithToken(
  db: PaymentEvidenceMobileUploadDb,
  input: {
    token: string
    fileBuffer: Buffer
    contentType?: string
  }
): Promise<UploadPaymentEvidenceResult> {
  const resolved = await resolvePaymentEvidenceUploadFromToken(db, input.token)
  return uploadPaymentEvidenceForReceipt(db, {
    branchId: resolved.branchId,
    branchCode: resolved.branchCode,
    receiptNo: resolved.receiptNo,
    fileBuffer: input.fileBuffer,
    contentType: input.contentType,
  })
}
