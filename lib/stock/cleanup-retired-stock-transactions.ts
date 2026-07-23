import type { PrismaClient } from "@/generated/prisma/client"

export type StockTransactionCleanupCountsByRefType = Record<string, number>

export type StockTransactionCleanupReport = {
  total: number
  byRefType: StockTransactionCleanupCountsByRefType
  byBranchId: Record<string, number>
  byYearMonth: Record<string, number>
  relatedStockRowCount: number
  relatedStockLayerCount: number
  /** No other model FKs point at StockTransaction.id. */
  inboundForeignKeys: string[]
}

function yearMonthKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1
}

/**
 * Pre-delete inspection for retired per-event StockTransaction rows.
 * Does not mutate data. Does not touch Sale, StockDocument, Finance vouchers.
 */
export async function inspectRetiredStockTransactions(
  db: Pick<
    PrismaClient,
    "stockTransaction" | "stock" | "stockLayer"
  >
): Promise<StockTransactionCleanupReport> {
  const [rows, relatedStockRowCount, relatedStockLayerCount] = await Promise.all([
    db.stockTransaction.findMany({
      select: {
        refType: true,
        branchId: true,
        date: true,
      },
    }),
    db.stock.count(),
    db.stockLayer.count(),
  ])

  const byRefType: StockTransactionCleanupCountsByRefType = {}
  const byBranchId: Record<string, number> = {}
  const byYearMonth: Record<string, number> = {}

  for (const row of rows) {
    bump(byRefType, row.refType || "(empty)")
    bump(byBranchId, row.branchId)
    bump(byYearMonth, yearMonthKey(row.date))
  }

  return {
    total: rows.length,
    byRefType,
    byBranchId,
    byYearMonth,
    relatedStockRowCount,
    relatedStockLayerCount,
    inboundForeignKeys: [],
  }
}

export type ExecuteRetiredStockTransactionCleanupResult = {
  deleted: number
  remaining: number
  reportBefore: StockTransactionCleanupReport
}

/**
 * Idempotent deletion of all StockTransaction rows (retired per-event ledger).
 * Leaves Stock, StockLayer, Sale, StockDocument, and Finance vouchers untouched.
 */
export async function executeRetiredStockTransactionCleanup(
  db: Pick<PrismaClient, "stockTransaction" | "stock" | "stockLayer" | "$transaction">
): Promise<ExecuteRetiredStockTransactionCleanupResult> {
  const reportBefore = await inspectRetiredStockTransactions(db)

  const deleted = await db.$transaction(async (tx) => {
    const result = await tx.stockTransaction.deleteMany({})
    return result.count
  })

  const remaining = await db.stockTransaction.count()
  if (remaining !== 0) {
    throw new Error(
      `StockTransaction cleanup failed: expected 0 remaining rows, found ${remaining}`
    )
  }

  return { deleted, remaining, reportBefore }
}
