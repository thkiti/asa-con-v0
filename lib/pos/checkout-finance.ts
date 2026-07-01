import type { Prisma } from "@/generated/prisma/client"
import type { PaymentMethod } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import type { PosVatEconomics } from "@/lib/finance/pos-sale-vat"
import type { PostSaleVoucherInput } from "@/lib/finance/posting-types"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"

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
  legalEntityCode: DocumentEntityCode
  receiptNo: string
  sale: {
    id: string
    branchId: string
    total: Prisma.Decimal | number | string
    createdAt: Date
    netAmount?: Prisma.Decimal | number | string | null
    vatAmount?: Prisma.Decimal | number | string | null
    vatRateBps?: number | null
    taxCode?: string | null
    outputVatAccountCode?: string | null
  }
  payment: { method: PaymentMethod }
  ledgerRows: LedgerIssueRow[]
  vatEconomics: PosVatEconomics
}): PostSaleVoucherInput {
  const cogsAmount = sumCogsFromLedgerIssues(input.ledgerRows)
  return {
    tx: input.tx,
    legalEntityCode: input.legalEntityCode,
    sale: {
      id: input.sale.id,
      branchId: input.sale.branchId,
      receiptNo: input.receiptNo,
      total: input.sale.total,
      paymentMethod: input.payment.method,
      createdAt: input.sale.createdAt,
      netAmount: input.sale.netAmount,
      vatAmount: input.sale.vatAmount,
      vatRateBps: input.sale.vatRateBps,
      taxCode: input.sale.taxCode,
      outputVatAccountCode: input.sale.outputVatAccountCode,
    },
    vatEconomics: input.vatEconomics,
    ledgerResult: { cogsAmount },
  }
}
