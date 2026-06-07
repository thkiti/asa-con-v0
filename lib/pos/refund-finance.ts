import type { PaymentMethod, Prisma } from "@/generated/prisma/client"
import type { PostRefundVoucherInput } from "@/lib/finance/posting-types"

export function buildPostRefundVoucherInput(input: {
  tx: Prisma.TransactionClient
  refund: {
    id: string
    branchId: string
    refundNo: string
    amount: Prisma.Decimal | number | string
    createdAt: Date
  }
  paymentMethod: PaymentMethod
}): PostRefundVoucherInput {
  return {
    tx: input.tx,
    refund: {
      id: input.refund.id,
      branchId: input.refund.branchId,
      refundNo: input.refund.refundNo,
      amount: input.refund.amount,
      createdAt: input.refund.createdAt,
    },
    paymentMethod: input.paymentMethod,
  }
}
