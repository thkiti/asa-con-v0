import { SaleStatus, type Prisma } from "@/generated/prisma/client"
import { formatCashierDisplay } from "./format-cashier-display"
import { toDec, ZERO } from "@/lib/stock/decimal"

export const REFUNDABLE_RECEIPT_MAX_AGE_MONTHS = 2
export const REFUNDABLE_RECEIPT_DEFAULT_LIMIT = 50

export type RefundableReceiptSummary = {
  receiptNo: string
  saleId: string
  issuedAt: string
  total: string
  alreadyRefunded: string
  remaining: string
  cashierDisplay: string | null
}

export type SearchRefundableReceiptsInput = {
  branchId: string
  query?: string | null
  at?: Date
  limit?: number
}

type SearchRefundableReceiptsDb = Pick<
  Prisma.TransactionClient,
  "receipt" | "refund" | "staff"
>

export function refundableReceiptCutoff(at: Date = new Date()): Date {
  const cutoff = new Date(at)
  cutoff.setMonth(cutoff.getMonth() - REFUNDABLE_RECEIPT_MAX_AGE_MONTHS)
  return cutoff
}

export async function searchRefundableReceipts(
  db: SearchRefundableReceiptsDb,
  input: SearchRefundableReceiptsInput
): Promise<RefundableReceiptSummary[]> {
  const branchId = String(input.branchId ?? "").trim()
  if (!branchId) return []

  const at = input.at ?? new Date()
  const cutoff = refundableReceiptCutoff(at)
  const query = input.query?.trim() ?? ""
  const limit = input.limit ?? REFUNDABLE_RECEIPT_DEFAULT_LIMIT

  const receipts = await db.receipt.findMany({
    where: {
      branchId,
      issuedAt: { gte: cutoff },
      sale: { status: SaleStatus.COMPLETED },
      ...(query
        ? { receiptNo: { contains: query, mode: "insensitive" as const } }
        : {}),
    },
    include: {
      sale: {
        select: {
          id: true,
          total: true,
          staffId: true,
        },
      },
    },
    orderBy: { issuedAt: "desc" },
    take: limit,
  })

  if (receipts.length === 0) return []

  const saleIds = receipts.map((row) => row.saleId)
  const refundGroups = await db.refund.groupBy({
    by: ["saleId"],
    where: { saleId: { in: saleIds } },
    _sum: { amount: true },
  })
  const refundedBySaleId = new Map<string, Prisma.Decimal>()
  for (const group of refundGroups) {
    if (group.saleId) {
      refundedBySaleId.set(group.saleId, toDec(group._sum.amount))
    }
  }

  const staffIds = [
    ...new Set(
      receipts
        .map((row) => row.sale.staffId?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const staffRows =
    staffIds.length > 0
      ? await db.staff.findMany({
          where: { staffId: { in: staffIds } },
          select: { staffId: true, name: true },
        })
      : []
  const staffNameByStaffId = new Map(
    staffRows.map((row) => [row.staffId, row.name] as const)
  )

  const results: RefundableReceiptSummary[] = []
  for (const receipt of receipts) {
    const saleTotal = toDec(receipt.sale.total)
    const alreadyRefunded = refundedBySaleId.get(receipt.saleId) ?? ZERO
    const remaining = saleTotal.minus(alreadyRefunded)
    if (remaining.lte(ZERO)) continue

    const staffId = receipt.sale.staffId?.trim() ?? null
    results.push({
      receiptNo: receipt.receiptNo,
      saleId: receipt.saleId,
      issuedAt: receipt.issuedAt.toISOString(),
      total: saleTotal.toFixed(2),
      alreadyRefunded: alreadyRefunded.toFixed(2),
      remaining: remaining.toFixed(2),
      cashierDisplay: staffId
        ? formatCashierDisplay(staffId, staffNameByStaffId.get(staffId) ?? null)
        : null,
    })
  }

  return results
}
