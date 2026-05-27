import type {
  InventoryReconciliationResult,
  ReconciliationVariance,
  SalesReconciliationResult,
} from "./reconciliation-types"
import type {
  ReconciliationSnapshotRowStatus,
  SnapshotDashboardRow,
} from "./reconciliation-snapshot-types"

export function isZeroAmount(value: string): boolean {
  const num = Number(value)
  return Number.isNaN(num) || Math.abs(num) < 0.005
}

export function deriveRowStatus(
  operationalAmount: string,
  glAmount: string,
  variance: string
): ReconciliationSnapshotRowStatus {
  if (isZeroAmount(variance)) {
    return "MATCHED"
  }

  const opZero = isZeroAmount(operationalAmount)
  const glZero = isZeroAmount(glAmount)

  if (opZero && !glZero) {
    return "MISSING_SOURCE"
  }
  if (!opZero && glZero) {
    return "MISSING_GL"
  }
  return "VARIANCE"
}

export function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function formatSnapshotPeriodLabel(input: {
  periodKey?: string
  fromDate: Date
  toDate: Date
}): string {
  const periodKey = input.periodKey?.trim()
  if (periodKey) {
    return periodKey
  }

  const from = formatDateOnly(input.fromDate)
  const to = formatDateOnly(input.toDate)
  if (from && to) {
    return `${from} → ${to}`
  }
  if (from) {
    return `from ${from}`
  }
  if (to) {
    return `to ${to}`
  }
  return "All dates"
}

function domainLabel(domain: string): string {
  switch (domain) {
    case "inventory":
      return "Inventory"
    case "revenue":
      return "Revenue"
    case "tender":
      return "Tender"
    default:
      return domain
  }
}

export function varianceRowsFromResults(input: {
  inventory: InventoryReconciliationResult
  sales: SalesReconciliationResult
}): ReconciliationVariance[] {
  const seen = new Set<string>()
  const rows: ReconciliationVariance[] = []

  for (const row of [
    ...input.inventory.variances,
    ...input.sales.variances,
  ]) {
    const key = `${row.domain}:${row.label}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push(row)
  }

  return rows
}

export function toSnapshotDashboardRows(input: {
  rows: ReconciliationVariance[]
  branchId?: string
  periodLabel: string
}): SnapshotDashboardRow[] {
  return input.rows.map((row) => ({
    id: `${row.domain}:${row.label}`,
    sourceType: domainLabel(row.domain),
    reference: row.label,
    branchId: input.branchId?.trim() || "All branches",
    periodLabel: input.periodLabel,
    expectedAmount: row.operationalAmount,
    actualAmount: row.glAmount,
    variance: row.variance,
    status: deriveRowStatus(
      row.operationalAmount,
      row.glAmount,
      row.variance
    ),
    varianceReason: row.varianceReason,
    varianceType: row.varianceType,
    domain: row.domain,
    raw: row,
  }))
}

export type SnapshotDashboardSummary = {
  matchedCount: number
  unmatchedCount: number
  varianceCount: number
  totalVarianceAmount: string
  rowCount: number
}

export function summarizeSnapshotDashboardRows(
  rows: SnapshotDashboardRow[]
): SnapshotDashboardSummary {
  let matchedCount = 0
  let varianceCount = 0
  let totalVarianceAbs = 0

  for (const row of rows) {
    if (row.status === "MATCHED") {
      matchedCount += 1
    } else {
      varianceCount += 1
      const num = Number(row.variance)
      if (!Number.isNaN(num)) {
        totalVarianceAbs += Math.abs(num)
      }
    }
  }

  return {
    matchedCount,
    unmatchedCount: rows.length - matchedCount,
    varianceCount,
    totalVarianceAmount: totalVarianceAbs.toFixed(2),
    rowCount: rows.length,
  }
}
