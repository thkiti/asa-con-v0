import type { DocType, Prisma } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import type { PostStockDocumentVoucherInput } from "@/lib/finance/posting-types"

export type LedgerMoveRow = {
  qtyIn: number
  qtyOut: number
  unitCost: Prisma.Decimal | number | string
}

export function sumInboundValueFromLedger(rows: LedgerMoveRow[]): Prisma.Decimal {
  return rows.reduce((sum, row) => {
    if (row.qtyIn <= 0) return sum
    const lineValue = toMoney(row.unitCost).mul(row.qtyIn)
    return addMoney(sum, lineValue)
  }, ZERO)
}

export function sumOutboundValueFromLedger(rows: LedgerMoveRow[]): Prisma.Decimal {
  return rows.reduce((sum, row) => {
    if (row.qtyOut <= 0) return sum
    const lineValue = toMoney(row.unitCost).mul(row.qtyOut)
    return addMoney(sum, lineValue)
  }, ZERO)
}

export function buildPostStockDocumentVoucherInput(input: {
  tx: Prisma.TransactionClient
  doc: {
    id: string
    refNo: string
    branchId: string
    docType: DocType
  }
  ledgerRows: LedgerMoveRow[]
}): PostStockDocumentVoucherInput {
  const inboundValue = sumInboundValueFromLedger(input.ledgerRows)
  const outboundValue = sumOutboundValueFromLedger(input.ledgerRows)
  return {
    tx: input.tx,
    doc: input.doc,
    ledgerResult: {
      inboundValue,
      ...(outboundValue.gt(0) ? { outboundValue } : {}),
    },
  }
}
