import { parseLegacySaleDate } from "./normalize-row"
import type { LegacySalesRowRef } from "./types"
import { buildLegacyTransactionKey } from "./transaction-key"

export function buildLegacySalesValidationAggregates(rows: LegacySalesRowRef[]) {
  const byDate = new Map<string, LegacySalesAggregateAccumulator>()
  const byBranch = new Map<string, LegacySalesAggregateAccumulator>()
  const transactionKeys = new Set<string>()

  for (const row of rows) {
    const txKey = buildLegacyTransactionKey({
      legacyBranchId: row.legacyBranchId,
      legacyDate: row.legacyDate,
      legacyTransNo: row.legacyTransNo,
    })
    transactionKeys.add(txKey)

    const amount = Number(row.amount.toString())
    const dateKey = parseLegacySaleDate(row.legacyDate)?.dateKey ?? row.legacyDate
    bumpAggregate(byDate, dateKey, row, txKey, amount)
    bumpAggregate(byBranch, row.legacyBranchId, row, txKey, amount)
  }

  return {
    byDate: [...byDate.entries()].map(([key, value]) => finalizeAggregate(key, value)),
    byBranch: [...byBranch.entries()].map(([key, value]) => finalizeAggregate(key, value)),
    totals: {
      transactionCount: transactionKeys.size,
      lineCount: rows.length,
      totalAmount: rows.reduce((sum, row) => sum + Number(row.amount.toString()), 0),
    },
  }
}

type LegacySalesAggregateAccumulator = {
  transactionKeys: Set<string>
  lineCount: number
  totalAmount: number
  unmatchedProductCount: number
}

function bumpAggregate(
  map: Map<string, LegacySalesAggregateAccumulator>,
  key: string,
  row: LegacySalesRowRef,
  txKey: string,
  amount: number
) {
  const current = map.get(key) ?? {
    transactionKeys: new Set<string>(),
    lineCount: 0,
    totalAmount: 0,
    unmatchedProductCount: 0,
  }
  current.transactionKeys.add(txKey)
  current.lineCount++
  current.totalAmount += amount
  if (!row.mappedProductId) current.unmatchedProductCount++
  map.set(key, current)
}

function finalizeAggregate(key: string, value: LegacySalesAggregateAccumulator) {
  return {
    key,
    transactionCount: value.transactionKeys.size,
    lineCount: value.lineCount,
    totalAmount: value.totalAmount,
    unmatchedProductCount: value.unmatchedProductCount,
  }
}
