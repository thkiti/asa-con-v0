import { RefundKind, type PrismaClient } from "@/generated/prisma/client"
import { formatCashierDisplay } from "./format-cashier-display"
import { PosLookupError } from "./pos-errors"

export type RefundReceiptView = {
  refundId: string
  refundNo: string
  issuedAt: string
  kind: RefundKind
  amount: string
  reason: string | null
  branchId: string
  branchCode: string
  branchName: string
  cashierDisplay: string | null
  saleId: string | null
  originalReceiptId: string | null
  originalReceiptNo: string | null
}

export type RefundReceiptDb = Pick<PrismaClient, "refund" | "staff">

export async function loadRefundReceiptForPrint(
  db: RefundReceiptDb,
  input: { refundId: string; branchId: string }
): Promise<RefundReceiptView> {
  const refundId = String(input.refundId ?? "").trim()
  const branchId = String(input.branchId ?? "").trim()
  if (!refundId) {
    throw new PosLookupError("Refund id is required", "INVALID_REFUND_ID", 400)
  }
  if (!branchId) {
    throw new PosLookupError("Branch is required", "INVALID_BRANCH", 400)
  }

  const refund = await db.refund.findFirst({
    where: { id: refundId, branchId },
    include: {
      branch: { select: { code: true, name: true } },
      originalReceipt: { select: { id: true, receiptNo: true } },
    },
  })

  if (!refund) {
    throw new PosLookupError("Refund receipt not found", "REFUND_NOT_FOUND", 404)
  }

  if (
    refund.kind === RefundKind.SALE_LINKED &&
    refund.originalReceiptId != null &&
    !refund.originalReceipt
  ) {
    throw new PosLookupError(
      "Original sale receipt not found for refund",
      "REFUND_ORIGINAL_RECEIPT_NOT_FOUND",
      404
    )
  }

  let staffName: string | null = null
  if (refund.staffId?.trim()) {
    const staff = await db.staff.findUnique({
      where: { staffId: refund.staffId.trim() },
      select: { name: true },
    })
    staffName = staff?.name ?? null
  }

  return {
    refundId: refund.id,
    refundNo: refund.refundNo,
    issuedAt: refund.createdAt.toISOString(),
    kind: refund.kind,
    amount: refund.amount.toFixed(2),
    reason: refund.reason,
    branchId: refund.branchId,
    branchCode: refund.branch.code,
    branchName: refund.branch.name,
    cashierDisplay: formatCashierDisplay(refund.staffId, staffName),
    saleId: refund.saleId,
    originalReceiptId: refund.originalReceiptId,
    originalReceiptNo: refund.originalReceipt?.receiptNo ?? null,
  }
}
