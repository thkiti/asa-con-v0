import { rowsToCsvTable, sortByStableKey } from "./csv"
import type {
  FinanceFilterValues,
  InventoryReconciliationResult,
  ReconciliationVariance,
  SalesReconciliationResult,
} from "./types"

export type ReconciliationRowStatus =
  | "MATCHED"
  | "VARIANCE"
  | "MISSING_SOURCE"
  | "MISSING_GL"

export type ReconciliationDashboardRow = {
  id: string
  sourceType: string
  reference: string
  branchId: string
  periodLabel: string
  expectedAmount: string
  actualAmount: string
  variance: string
  status: ReconciliationRowStatus
  varianceReason?: string
  varianceType?: string
  domain: string
  raw: ReconciliationVariance
}

export type ReconciliationDashboardSummary = {
  matchedCount: number
  unmatchedCount: number
  varianceCount: number
  totalVarianceAmount: string
  rowCount: number
}

export type ReconciliationDashboardFilter = FinanceFilterValues & {
  periodKey?: string
  domain?: string
  status?: ReconciliationRowStatus | "ALL"
}

const PERIOD_KEY_PATTERN = /^\d{4}-\d{2}$/

export function isZeroAmount(value: string): boolean {
  const num = Number(value)
  return Number.isNaN(num) || Math.abs(num) < 0.005
}

export function deriveRowStatus(
  operationalAmount: string,
  glAmount: string,
  variance: string
): ReconciliationRowStatus {
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

export function periodKeyToDateRange(periodKey: string): {
  from: string
  to: string
} | null {
  if (!PERIOD_KEY_PATTERN.test(periodKey)) {
    return null
  }
  const [yearStr, monthStr] = periodKey.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!year || month < 1 || month > 12) {
    return null
  }
  const lastDay = new Date(year, month, 0).getDate()
  const mm = String(month).padStart(2, "0")
  return {
    from: `${yearStr}-${mm}-01`,
    to: `${yearStr}-${mm}-${String(lastDay).padStart(2, "0")}`,
  }
}

export function buildApiFilter(
  filter: ReconciliationDashboardFilter
): FinanceFilterValues {
  const apiFilter: FinanceFilterValues = {
    branchId: filter.branchId,
    from: filter.from,
    to: filter.to,
  }

  const periodKey = filter.periodKey?.trim()
  if (periodKey) {
    const range = periodKeyToDateRange(periodKey)
    if (range) {
      apiFilter.from = range.from
      apiFilter.to = range.to
    }
  }

  return apiFilter
}

export function formatPeriodLabel(filter: FinanceFilterValues): string {
  if (filter.from && filter.to) {
    return `${filter.from} → ${filter.to}`
  }
  if (filter.from) {
    return `from ${filter.from}`
  }
  if (filter.to) {
    return `to ${filter.to}`
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

export function toDashboardRows(input: {
  rows: ReconciliationVariance[]
  branchId?: string
  periodLabel: string
}): ReconciliationDashboardRow[] {
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

export function filterDashboardRows(
  rows: ReconciliationDashboardRow[],
  filter: ReconciliationDashboardFilter
): ReconciliationDashboardRow[] {
  const domain = filter.domain?.trim().toLowerCase()
  const status = filter.status ?? "ALL"

  return rows.filter((row) => {
    if (domain && domain !== "all" && row.domain !== domain) {
      return false
    }
    if (status !== "ALL" && row.status !== status) {
      return false
    }
    return true
  })
}

export function summarizeDashboardRows(
  rows: ReconciliationDashboardRow[]
): ReconciliationDashboardSummary {
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

export function sortDashboardRows(
  rows: ReconciliationDashboardRow[],
  key: keyof ReconciliationDashboardRow,
  direction: "asc" | "desc"
): ReconciliationDashboardRow[] {
  const sorted = [...rows]
  sorted.sort((a, b) => {
    const left = a[key]
    const right = b[key]
    if (typeof left === "number" && typeof right === "number") {
      return direction === "asc" ? left - right : right - left
    }

    const leftNum = Number(left)
    const rightNum = Number(right)
    if (
      !Number.isNaN(leftNum) &&
      !Number.isNaN(rightNum) &&
      String(left).trim() !== "" &&
      String(right).trim() !== ""
    ) {
      return direction === "asc" ? leftNum - rightNum : rightNum - leftNum
    }

    const cmp = String(left ?? "").localeCompare(String(right ?? ""))
    return direction === "asc" ? cmp : -cmp
  })
  return sorted
}

export function rowsToCsv(rows: ReconciliationDashboardRow[]): string {
  const sorted = sortByStableKey(rows, (row) => row.id)
  return rowsToCsvTable(
    [
      "sourceType",
      "reference",
      "branch",
      "period",
      "expectedAmount",
      "actualAmount",
      "variance",
      "status",
    ],
    sorted.map((row) => [
      row.sourceType,
      row.reference,
      row.branchId,
      row.periodLabel,
      row.expectedAmount,
      row.actualAmount,
      row.variance,
      row.status,
    ])
  )
}
