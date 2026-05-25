import type { Prisma } from "@/generated/prisma/client"
import type { PaymentMethod } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import type { PostSaleVoucherInput } from "@/lib/finance/posting-types"

export type LedgerIssueRow = {
  qtyOut: number
  unitCost: Prisma.Decimal | number | string
}

/** Sum COGS from ledger issue rows (qtyOut × unitCost) — never SaleItem prices. */
export function sumCogsFromLedgerIssues(rows: LedgerIssueRow[]): Prisma.Decimal {
  return rows.reduce((sum, row) => {
    if (row.qtyOut <= 0) return sum
    const lineCost = toMoney(row.unitCost).mul(row.qtyOut)
    return addMoney(sum, lineCost)
  }, ZERO)
}

export function buildPostSaleVoucherInput(input: {
  tx: Prisma.TransactionClient
  sale: {
    id: string
    branchId: string
    total: Prisma.Decimal | number | string
  }
  payment: { method: PaymentMethod }
  ledgerRows: LedgerIssueRow[]
}): PostSaleVoucherInput {
  const cogsAmount = sumCogsFromLedgerIssues(input.ledgerRows)
  return {
    tx: input.tx,
    sale: {
      id: input.sale.id,
      branchId: input.sale.branchId,
      total: input.sale.total,
      paymentMethod: input.payment.method,
    },
    ledgerResult: { cogsAmount },
  }
}
