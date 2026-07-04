import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import { formatPeriodStatusLabel } from "./periods"

export const FINANCE_PERIOD_QUERY = "periodKey"

export const FINANCE_PERIOD_FILTER_EMPTY_MESSAGE =
  "No accounting period found for this entity."

/** Descending by periodKey — newest first. */
export function sortAccountingPeriodsDesc(
  periods: AccountingPeriodRow[]
): AccountingPeriodRow[] {
  return [...periods].sort((a, b) => b.periodKey.localeCompare(a.periodKey))
}

export function isAccountingPeriodKeyInList(
  periodKey: string,
  periods: AccountingPeriodRow[]
): boolean {
  const normalized = periodKey.trim()
  if (!normalized) return false
  return periods.some((row) => row.periodKey === normalized)
}

/**
 * Latest periodKey for the entity after descending sort.
 * All normal lifecycle rows (OPEN / SOFT_CLOSED / HARD_CLOSED) are eligible.
 */
export function pickLatestAccountingPeriodKey(
  periods: AccountingPeriodRow[]
): string | null {
  const sorted = sortAccountingPeriodsDesc(periods)
  return sorted[0]?.periodKey ?? null
}

/**
 * Resolve effective period: valid URL key wins; otherwise latest in list.
 */
export function resolveFinancePeriodFilterKey(input: {
  periods: AccountingPeriodRow[]
  urlPeriodKey?: string | null
}): string | null {
  const urlKey = input.urlPeriodKey?.trim() ?? ""
  if (urlKey && isAccountingPeriodKeyInList(urlKey, input.periods)) {
    return urlKey
  }
  return pickLatestAccountingPeriodKey(input.periods)
}

export function formatAccountingPeriodOptionLabel(period: AccountingPeriodRow): string {
  const statusLabel = period.status.replace(/_/g, " ")
  return `${period.periodKey} (${statusLabel})`
}

export function formatAccountingPeriodSelectedTooltip(period: AccountingPeriodRow): string {
  return `${period.periodKey} • ${formatPeriodStatusLabel(period.status)}`
}

export function readPeriodKeyFromSearchParams(
  params: Pick<URLSearchParams, "get">
): string | null {
  const value = params.get(FINANCE_PERIOD_QUERY)?.trim()
  return value || null
}

/** Merge legalEntityCode + periodKey into the current path query string. */
export function buildFinanceScopeSearchParams(input: {
  searchParams: URLSearchParams | string
  legalEntityCode: string
  periodKey?: string | null
}): URLSearchParams {
  const params = new URLSearchParams(
    typeof input.searchParams === "string" ? input.searchParams : input.searchParams.toString()
  )
  params.set("legalEntityCode", input.legalEntityCode)
  if (input.periodKey?.trim()) {
    params.set(FINANCE_PERIOD_QUERY, input.periodKey.trim())
  } else {
    params.delete(FINANCE_PERIOD_QUERY)
  }
  return params
}
