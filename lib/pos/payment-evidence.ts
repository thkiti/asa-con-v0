import {
  PaymentEvidenceStatus,
  PaymentMethod,
  type Prisma,
  type PrismaClient,
} from "@/generated/prisma/client"

export type ReceiptEvidenceStatus = PaymentEvidenceStatus

export function resolveReceiptEvidenceStatus(input: {
  paymentMethod: PaymentMethod | string
  evidenceStatus: PaymentEvidenceStatus | null | undefined
}): ReceiptEvidenceStatus | null {
  if (input.paymentMethod !== PaymentMethod.BANK_TRANSFER) {
    return null
  }
  return input.evidenceStatus ?? PaymentEvidenceStatus.PENDING
}

export async function createPendingPaymentEvidenceRow(
  tx: Prisma.TransactionClient,
  args: {
    branchId: string
    receiptNo: string
    receiptId: string
    saleId: string
    paymentId: string
  }
) {
  return tx.paymentEvidence.create({
    data: {
      branchId: args.branchId,
      receiptNo: args.receiptNo,
      receiptId: args.receiptId,
      saleId: args.saleId,
      paymentId: args.paymentId,
      status: PaymentEvidenceStatus.PENDING,
    },
  })
}

export function requiresPaymentEvidence(method: PaymentMethod): boolean {
  return method === PaymentMethod.BANK_TRANSFER
}

export type MarkPaymentEvidenceUploadedInput = {
  evidenceId: string
  blobPathname: string
  blobUrl: string
  byteSize: number
  mimeType?: string
}

export type PaymentEvidenceMarkDb = Pick<PrismaClient, "paymentEvidence">

export async function markPaymentEvidenceUploaded(
  db: PaymentEvidenceMarkDb,
  input: MarkPaymentEvidenceUploadedInput
) {
  return db.paymentEvidence.update({
    where: { id: input.evidenceId },
    data: {
      status: PaymentEvidenceStatus.UPLOADED,
      blobPathname: input.blobPathname,
      blobUrl: input.blobUrl,
      byteSize: input.byteSize,
      mimeType: input.mimeType?.trim() || "image/jpeg",
      uploadedAt: new Date(),
      uploadError: null,
    },
  })
}
