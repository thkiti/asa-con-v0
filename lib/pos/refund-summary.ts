import { PaymentMethod, type Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import { normalizeDateRange } from "@/lib/reporting/date-range"
import type { PaymentBreakdownEntry } from "@/lib/reporting/report-types"
import { toDec, ZERO } from "@/lib/stock/decimal"

export type RefundSummaryFilter = {
  branchId?: string
  from?: Date | string
  to?: Date | string
}

export type RefundSummaryResult = {
  refundCount: number
  refundTotal: string
  paymentBreakdown: PaymentBreakdownEntry[]
  missingPaymentCount: number
}

export type RefundSummaryPrisma = Pick<PrismaClient, "refund">

export async function getRefundSummary(
  prisma: RefundSummaryPrisma,
  filter: RefundSummaryFilter = {}
): Promise<RefundSummaryResult> {
  const where: Prisma.RefundWhereInput = {}

  if (filter.branchId) where.branchId = filter.branchId
  if (filter.from != null && filter.to != null) {
    const range = normalizeDateRange({ from: filter.from, to: filter.to })
    where.createdAt = { gte: range.start, lt: range.endExclusive }
  }

  const refunds = await prisma.refund.findMany({
    where,
    include: {
      sale: {
        include: { payment: true },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  let refundTotal = ZERO
  const paymentMap = new Map<string, PaymentBreakdownEntry>()
  let missingPaymentCount = 0

  for (const refund of refunds) {
    const amount = toDec(refund.amount)
    refundTotal = refundTotal.plus(amount)

    const payment = refund.sale?.payment
    if (!payment) {
      missingPaymentCount += 1
      continue
    }

    const method = payment.method
    const existing = paymentMap.get(method)
    if (existing) {
      existing.saleCount += 1
      existing.amount = toDec(existing.amount).plus(amount).toString()
    } else {
      paymentMap.set(method, {
        method,
        amount: amount.toString(),
        saleCount: 1,
      })
    }
  }

  return {
    refundCount: refunds.length,
    refundTotal: refundTotal.toString(),
    paymentBreakdown: [...paymentMap.values()],
    missingPaymentCount,
  }
}

export function refundCashTotal(
  paymentBreakdown: PaymentBreakdownEntry[]
): string {
  return (
    paymentBreakdown.find((p) => p.method === PaymentMethod.CASH)?.amount ?? "0"
  )
}

export function refundCardTotal(
  paymentBreakdown: PaymentBreakdownEntry[]
): string {
  return (
    paymentBreakdown.find((p) => p.method === PaymentMethod.CARD)?.amount ?? "0"
  )
}
