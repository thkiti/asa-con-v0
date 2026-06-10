import { ReportError } from "@/lib/reporting/report-errors"
import { normalizeDateRange } from "@/lib/reporting/date-range"
import type { TrialBalanceFilter } from "./trial-balance-types"

const PERIOD_KEY_PATTERN = /^\d{4}-\d{2}$/

export type ReportFilterParams = {
  get(name: string): string | null
}

export function parseHideZeroBalances(value: string | null | undefined): boolean {
  const raw = String(value ?? "").trim().toLowerCase()
  return raw === "true" || raw === "1" || raw === "yes"
}

export function parseTrialBalanceFilter(params: ReportFilterParams): TrialBalanceFilter {
  const branchId = params.get("branchId")?.trim() ?? ""
  const periodKey = params.get("periodKey")?.trim() || undefined
  const from = params.get("from")?.trim() || undefined
  const to = params.get("to")?.trim() || undefined
  const hideZeroBalances = parseHideZeroBalances(params.get("hideZeroBalances"))

  if (!branchId) {
    throw new ReportError("branchId is required", "EMPTY_FILTER")
  }

  const hasPeriod = Boolean(periodKey)
  const hasDateRange = Boolean(from || to)

  if (hasPeriod && hasDateRange) {
    throw new ReportError(
      "Use either periodKey or from/to, not both",
      "INVALID_FILTER"
    )
  }

  if (!hasPeriod && !hasDateRange) {
    throw new ReportError(
      "periodKey or from/to date range is required",
      "EMPTY_FILTER"
    )
  }

  if (hasPeriod) {
    if (!PERIOD_KEY_PATTERN.test(periodKey!)) {
      throw new ReportError("periodKey must be YYYY-MM", "INVALID_FILTER")
    }
    return { branchId, periodKey, hideZeroBalances }
  }

  if (!from || !to) {
    throw new ReportError("from and to are both required for date range", "EMPTY_FILTER")
  }

  normalizeDateRange({ from, to })

  return { branchId, from, to, hideZeroBalances }
}
