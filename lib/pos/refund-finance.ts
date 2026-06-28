import type { PaymentMethod, Prisma } from "@/generated/prisma/client"
import { buildPosVatEconomics } from "@/lib/finance/pos-sale-vat"
import type { PostRefundVoucherInput } from "@/lib/finance/posting-types"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"

export function buildPostRefundVoucherInput(input: {
  tx: Prisma.TransactionClient
  legalEntityCode: DocumentEntityCode
  refund: {
    id: string
    branchId: string
    refundNo: string
    amount: Prisma.Decimal | number | string
    createdAt: Date
  }
  paymentMethod: PaymentMethod
  saleVatSnapshot: {
    vatRateBps: number
    taxCode: string
    outputVatAccountCode: string
  }
}): PostRefundVoucherInput {
  const vatEconomics = buildPosVatEconomics(input.refund.amount, {
    rateBps: input.saleVatSnapshot.vatRateBps,
    taxCode: input.saleVatSnapshot.taxCode,
    inclusive: true,
    outputVatAccountCode: input.saleVatSnapshot.outputVatAccountCode,
  })

  return {
    tx: input.tx,
    legalEntityCode: input.legalEntityCode,
    refund: {
      id: input.refund.id,
      branchId: input.refund.branchId,
      refundNo: input.refund.refundNo,
      amount: input.refund.amount,
      createdAt: input.refund.createdAt,
    },
    paymentMethod: input.paymentMethod,
    vatEconomics,
  }
}
