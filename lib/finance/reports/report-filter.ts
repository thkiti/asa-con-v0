import { ReportError } from "@/lib/reporting/report-errors"
import { normalizeDateRange, type NormalizedDateRange } from "@/lib/reporting/date-range"
import type { GeneralLedgerFilter } from "./general-ledger-types"
import type { BalanceSheetFilter } from "./balance-sheet-types"
import type { ProfitLossFilter } from "./profit-loss-types"
import type { ChangesInEquityFilter } from "./changes-in-equity-types"
import type { RetainedEarningsFilter } from "./retained-earnings-types"
import type { TrialBalanceFilter } from "./trial-balance-types"

const PERIOD_KEY_PATTERN = /^\d{4}-\d{2}$/

export type FinanceReportScope = {
  branchId: string
  periodKey?: string
  from?: string
  to?: string
}

export type ResolvedReportDateRange = {
  from: string
  to: string
  range: NormalizedDateRange
}

function parseFinanceReportScope(params: ReportFilterParams): FinanceReportScope {
  const branchId = params.get("branchId")?.trim() ?? ""
  const periodKey = params.get("periodKey")?.trim() || undefined
  const from = params.get("from")?.trim() || undefined
  const to = params.get("to")?.trim() || undefined

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
    return { branchId, periodKey }
  }

  if (!from || !to) {
    throw new ReportError("from and to are both required for date range", "EMPTY_FILTER")
  }

  normalizeDateRange({ from, to })
  return { branchId, from, to }
}

export function periodKeyToReportDateRange(periodKey: string): ResolvedReportDateRange {
  if (!PERIOD_KEY_PATTERN.test(periodKey)) {
    throw new ReportError("periodKey must be YYYY-MM", "INVALID_FILTER")
  }
  const [yearStr, monthStr] = periodKey.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!year || month < 1 || month > 12) {
    throw new ReportError("periodKey must be YYYY-MM", "INVALID_FILTER")
  }
  const lastDay = new Date(year, month, 0).getDate()
  const mm = String(month).padStart(2, "0")
  const from = `${yearStr}-${mm}-01`
  const to = `${yearStr}-${mm}-${String(lastDay).padStart(2, "0")}`
  const range = normalizeDateRange({ from, to })
  return { from, to, range }
}

export function resolveReportDateRange(
  scope: FinanceReportScope
): ResolvedReportDateRange {
  if (scope.periodKey) {
    return periodKeyToReportDateRange(scope.periodKey)
  }
  const from = scope.from!
  const to = scope.to!
  const range = normalizeDateRange({ from, to })
  return { from, to, range }
}

function parseAccountCodes(params: ReportFilterParams): string[] | undefined {
  const single = params.get("accountCode")?.trim()
  const repeated = (params.getAll?.("accountCodes") ?? []).flatMap((value) =>
    value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
  )
  const codes = [
    ...(single ? [single] : []),
    ...repeated,
  ]
  if (codes.length === 0) return undefined
  return [...new Set(codes)]
}

function parseAccountIds(params: ReportFilterParams): string[] | undefined {
  const single = params.get("accountId")?.trim()
  const repeated = (params.getAll?.("accountIds") ?? []).flatMap((value) =>
    value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
  )
  const ids = [
    ...(single ? [single] : []),
    ...repeated,
  ]
  if (ids.length === 0) return undefined
  return [...new Set(ids)]
}

export type ReportFilterParams = {
  get(name: string): string | null
  getAll?(name: string): string[]
}

export function parseHideZeroBalances(value: string | null | undefined): boolean {
  const raw = String(value ?? "").trim().toLowerCase()
  return raw === "true" || raw === "1" || raw === "yes"
}

export function parseTrialBalanceFilter(params: ReportFilterParams): TrialBalanceFilter {
  const scope = parseFinanceReportScope(params)
  const hideZeroBalances = parseHideZeroBalances(params.get("hideZeroBalances"))
  return { ...scope, hideZeroBalances }
}

export function parseGeneralLedgerFilter(params: ReportFilterParams): GeneralLedgerFilter {
  const scope = parseFinanceReportScope(params)
  const accountCodes = parseAccountCodes(params)
  const accountIds = parseAccountIds(params)
  return {
    ...scope,
    accountId: accountIds?.length === 1 ? accountIds[0] : undefined,
    accountIds: accountIds && accountIds.length > 1 ? accountIds : undefined,
    accountCode: accountCodes?.length === 1 ? accountCodes[0] : undefined,
    accountCodes: accountCodes && accountCodes.length > 1 ? accountCodes : undefined,
  }
}

export function parseProfitLossFilter(params: ReportFilterParams): ProfitLossFilter {
  return parseFinanceReportScope(params)
}

export function parseBalanceSheetFilter(params: ReportFilterParams): BalanceSheetFilter {
  const scope = parseFinanceReportScope(params)
  const hideZeroBalances = parseHideZeroBalances(params.get("hideZeroBalances"))
  return { ...scope, hideZeroBalances }
}

export function parseRetainedEarningsFilter(
  params: ReportFilterParams
): RetainedEarningsFilter {
  return parseFinanceReportScope(params)
}

export function parseChangesInEquityFilter(
  params: ReportFilterParams
): ChangesInEquityFilter {
  return parseFinanceReportScope(params)
}
