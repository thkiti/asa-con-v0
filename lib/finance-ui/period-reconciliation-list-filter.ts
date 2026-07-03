import { resolveManualJournalListDateRange } from "@/lib/finance-ui/manual-journal-entry-list-filter"
import { resolveAccountingPeriodKeyFilter } from "@/lib/finance/period-key"

export type PeriodReconciliationUiFilter = {
  periodKey: string
  dateFrom: string
  dateTo: string
  branchId: string
  glAccountId: string
}

function currentPeriodKey(reference = new Date()): string {
  return `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, "0")}`
}

export function defaultPeriodReconciliationUiFilter(
  reference = new Date()
): PeriodReconciliationUiFilter {
  return {
    periodKey: currentPeriodKey(reference),
    dateFrom: "",
    dateTo: "",
    branchId: "",
    glAccountId: "",
  }
}

export function resolvePeriodReconciliationPeriodKey(
  filter: Pick<PeriodReconciliationUiFilter, "periodKey" | "dateFrom" | "dateTo">
): string {
  const normalized = resolveAccountingPeriodKeyFilter(filter.periodKey)
  if (normalized) return normalized

  const from = filter.dateFrom.trim()
  if (from.length >= 7) {
    return from.slice(0, 7)
  }

  return filter.periodKey.trim()
}

export function isPeriodReconciliationMoreFilterActive(
  filter: Pick<PeriodReconciliationUiFilter, "periodKey" | "dateFrom" | "dateTo">
): boolean {
  const from = filter.dateFrom.trim()
  const to = filter.dateTo.trim()
  if (!from && !to) return false

  const periodRange = resolveManualJournalListDateRange({
    periodKey: filter.periodKey,
    dateFrom: "",
    dateTo: "",
  })

  if (!periodRange.dateFrom && !periodRange.dateTo) {
    return Boolean(from || to)
  }

  return from !== (periodRange.dateFrom ?? "") || to !== (periodRange.dateTo ?? "")
}

export function toPeriodReconciliationListQuery(
  filter: PeriodReconciliationUiFilter
): {
  periodKey: string
  branchId?: string
  glAccountId?: string
} {
  const periodKey = resolvePeriodReconciliationPeriodKey(filter)
  return {
    periodKey,
    ...(filter.branchId.trim() ? { branchId: filter.branchId.trim() } : {}),
    ...(filter.glAccountId.trim() ? { glAccountId: filter.glAccountId.trim() } : {}),
  }
}

export function parsePeriodReconciliationUiFilterFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): PeriodReconciliationUiFilter | null {
  const periodKey = searchParams.get("periodKey")?.trim()
  const branchId = searchParams.get("branchId")?.trim()
  const glAccountId = searchParams.get("glAccountId")?.trim()

  if (!periodKey && !branchId && !glAccountId) {
    return null
  }

  const defaults = defaultPeriodReconciliationUiFilter()
  return {
    ...defaults,
    periodKey: periodKey ?? defaults.periodKey,
    branchId: branchId ?? "",
    glAccountId: glAccountId ?? "",
  }
}
