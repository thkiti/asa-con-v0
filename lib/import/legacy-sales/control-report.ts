import { formatShopBranchCode } from "@/lib/import/validation/branch-code"
import { parseLegacySaleDate } from "./normalize-row"
import { buildLegacyTransactionKey } from "./transaction-key"

export type LegacySalesControlRow = {
  status: string
  legacyBranchId: string
  legacyTransNo: string
  legacyDate: string
  qty: number
  amount: { toString(): string }
}

export type LegacySalesControlAggregate = {
  transactionCount: number
  lineCount: number
  totalQty: number
  totalAmount: number
}

export type LegacySalesControlMonthShopRow = LegacySalesControlAggregate & {
  month: string
  shop: string
  legacyBranchId: string
}

export type LegacySalesControlShopRow = LegacySalesControlAggregate & {
  shop: string
  legacyBranchId: string
}

export type LegacySalesControlMonthRow = LegacySalesControlAggregate & {
  month: string
}

export type LegacySalesControlReport = {
  batchId: string
  includedLineCount: number
  excludedLineCount: number
  byMonthShop: LegacySalesControlMonthShopRow[]
  byShop: LegacySalesControlShopRow[]
  byMonth: LegacySalesControlMonthRow[]
  grandTotal: LegacySalesControlAggregate
}

export function isLegacyRefundCandidate(row: Pick<LegacySalesControlRow, "legacyTransNo" | "amount">): boolean {
  if (String(row.legacyTransNo).trim().startsWith("R")) return true
  return Number(row.amount.toString()) < 0
}

export function isLegacySalesControlIncludedRow(row: LegacySalesControlRow): boolean {
  if (row.status !== "VALID") return false
  if (String(row.legacyBranchId).trim() === "00") return false
  if (row.qty <= 0) return false
  if (Number(row.amount.toString()) <= 0) return false
  if (isLegacyRefundCandidate(row)) return false
  return true
}

type Accumulator = LegacySalesControlAggregate & {
  transactionKeys: Set<string>
}

function emptyAccumulator(): Accumulator {
  return {
    transactionKeys: new Set<string>(),
    transactionCount: 0,
    lineCount: 0,
    totalQty: 0,
    totalAmount: 0,
  }
}

function bumpAccumulator(
  acc: Accumulator,
  row: LegacySalesControlRow,
  txKey: string
): void {
  acc.transactionKeys.add(txKey)
  acc.lineCount++
  acc.totalQty += row.qty
  acc.totalAmount += Number(row.amount.toString())
  acc.transactionCount = acc.transactionKeys.size
}

function finalizeAccumulator(acc: Accumulator): LegacySalesControlAggregate {
  return {
    transactionCount: acc.transactionCount,
    lineCount: acc.lineCount,
    totalQty: acc.totalQty,
    totalAmount: acc.totalAmount,
  }
}

function resolveMonth(row: LegacySalesControlRow): string {
  return parseLegacySaleDate(row.legacyDate)?.dateKey.slice(0, 7) ?? row.legacyDate
}

function resolveShopLabel(legacyBranchId: string): string {
  const code = formatShopBranchCode(legacyBranchId)
  return code ? `${legacyBranchId} (${code})` : legacyBranchId
}

export function buildLegacySalesControlReport(
  batchId: string,
  rows: LegacySalesControlRow[]
): LegacySalesControlReport {
  const included = rows.filter(isLegacySalesControlIncludedRow)

  const byMonthShopAcc = new Map<string, Accumulator>()
  const byShopAcc = new Map<string, Accumulator>()
  const byMonthAcc = new Map<string, Accumulator>()
  const grandAcc = emptyAccumulator()

  for (const row of included) {
    const month = resolveMonth(row)
    const shop = resolveShopLabel(row.legacyBranchId)
    const txKey = buildLegacyTransactionKey({
      legacyBranchId: row.legacyBranchId,
      legacyDate: row.legacyDate,
      legacyTransNo: row.legacyTransNo,
    })

    const monthShopKey = `${month}|${row.legacyBranchId}`
    const monthShop = byMonthShopAcc.get(monthShopKey) ?? emptyAccumulator()
    bumpAccumulator(monthShop, row, txKey)
    byMonthShopAcc.set(monthShopKey, monthShop)

    const shopBucket = byShopAcc.get(row.legacyBranchId) ?? emptyAccumulator()
    bumpAccumulator(shopBucket, row, txKey)
    byShopAcc.set(row.legacyBranchId, shopBucket)

    const monthBucket = byMonthAcc.get(month) ?? emptyAccumulator()
    bumpAccumulator(monthBucket, row, txKey)
    byMonthAcc.set(month, monthBucket)

    bumpAccumulator(grandAcc, row, txKey)
  }

  const byMonthShop: LegacySalesControlMonthShopRow[] = [...byMonthShopAcc.entries()]
    .map(([key, acc]) => {
      const [month, legacyBranchId] = key.split("|")
      return {
        month: month!,
        shop: resolveShopLabel(legacyBranchId!),
        legacyBranchId: legacyBranchId!,
        ...finalizeAccumulator(acc),
      }
    })
    .sort((a, b) => a.month.localeCompare(b.month) || a.legacyBranchId.localeCompare(b.legacyBranchId))

  const byShop: LegacySalesControlShopRow[] = [...byShopAcc.entries()]
    .map(([legacyBranchId, acc]) => ({
      shop: resolveShopLabel(legacyBranchId),
      legacyBranchId,
      ...finalizeAccumulator(acc),
    }))
    .sort((a, b) => a.legacyBranchId.localeCompare(b.legacyBranchId))

  const byMonth: LegacySalesControlMonthRow[] = [...byMonthAcc.entries()]
    .map(([month, acc]) => ({
      month,
      ...finalizeAccumulator(acc),
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return {
    batchId,
    includedLineCount: included.length,
    excludedLineCount: rows.length - included.length,
    byMonthShop,
    byShop,
    byMonth,
    grandTotal: finalizeAccumulator(grandAcc),
  }
}

function formatMoney(value: number): string {
  return value.toFixed(2)
}

export function printLegacySalesControlReport(report: LegacySalesControlReport): void {
  console.log("\n=== Legacy Sales Pre-Convert Control Report ===")
  console.log(`Batch ID: ${report.batchId}`)
  console.log("Scope: VALID rows, positive sales only")
  console.log("Excluded: refund candidates, branch 00, zero qty, invalid rows")
  console.log(`Included lines: ${report.includedLineCount}`)
  console.log(`Excluded lines: ${report.excludedLineCount}`)
  console.log("")

  console.log("1. By month + shop")
  console.log("month\tshop\ttransactionCount\tlineCount\ttotalQty\ttotalSalesAmount")
  for (const row of report.byMonthShop) {
    console.log(
      [
        row.month,
        row.shop,
        row.transactionCount,
        row.lineCount,
        row.totalQty,
        formatMoney(row.totalAmount),
      ].join("\t")
    )
  }

  console.log("")
  console.log("2. By shop total")
  console.log("shop\ttransactionCount\tlineCount\ttotalQty\ttotalSalesAmount")
  for (const row of report.byShop) {
    console.log(
      [
        row.shop,
        row.transactionCount,
        row.lineCount,
        row.totalQty,
        formatMoney(row.totalAmount),
      ].join("\t")
    )
  }

  console.log("")
  console.log("3. By month total")
  console.log("month\ttransactionCount\tlineCount\ttotalQty\ttotalSalesAmount")
  for (const row of report.byMonth) {
    console.log(
      [
        row.month,
        row.transactionCount,
        row.lineCount,
        row.totalQty,
        formatMoney(row.totalAmount),
      ].join("\t")
    )
  }

  console.log("")
  console.log("4. Grand total")
  console.log(
    [
      "ALL",
      report.grandTotal.transactionCount,
      report.grandTotal.lineCount,
      report.grandTotal.totalQty,
      formatMoney(report.grandTotal.totalAmount),
    ].join("\t")
  )
  console.log("")
  console.log("Notes:")
  console.log("- Line/transaction counts may be lower than raw VALID totals when zero-amount VALID lines are excluded.")
  console.log("- Sales amount total should match VALID positive-sales control expectation.")
}

export async function runLegacySalesControlReport(
  db: {
    legacySalesImportBatch: {
      findUnique: (args: {
        where: { id: string }
        select: { id: true; sourceFileName: true; year: true; status: true }
      }) => Promise<{
        id: string
        sourceFileName: string
        year: number
        status: string
      } | null>
    }
    legacySalesImportRow: {
      findMany: (args: {
        where: { importBatchId: string }
        select: {
          status: true
          legacyBranchId: true
          legacyTransNo: true
          legacyDate: true
          qty: true
          amount: true
        }
      }) => Promise<LegacySalesControlRow[]>
    }
  },
  batchId: string
): Promise<LegacySalesControlReport> {
  const batch = await db.legacySalesImportBatch.findUnique({
    where: { id: batchId },
    select: { id: true, sourceFileName: true, year: true, status: true },
  })
  if (!batch) {
    throw new Error(`Import batch not found: ${batchId}`)
  }

  const rows = await db.legacySalesImportRow.findMany({
    where: { importBatchId: batchId },
    select: {
      status: true,
      legacyBranchId: true,
      legacyTransNo: true,
      legacyDate: true,
      qty: true,
      amount: true,
    },
  })

  return buildLegacySalesControlReport(batchId, rows)
}
