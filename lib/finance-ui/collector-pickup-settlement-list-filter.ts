import { resolveManualJournalListDateRange } from "@/lib/finance-ui/manual-journal-entry-list-filter"
import type { FinanceFilterValues } from "@/lib/finance-ui/types"

export type CollectorPickupSettlementUiFilter = {
  branchId: string
  periodKey: string
  dateFrom: string
  dateTo: string
}

export function defaultCollectorPickupSettlementPeriodKey(reference = new Date()): string {
  const y = reference.getFullYear()
  const m = String(reference.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export function defaultCollectorPickupSettlementUiFilter(
  reference = new Date()
): CollectorPickupSettlementUiFilter {
  return {
    branchId: "",
    periodKey: defaultCollectorPickupSettlementPeriodKey(reference),
    dateFrom: "",
    dateTo: "",
  }
}

export function resolveCollectorPickupSettlementDateRange(
  filter: Pick<CollectorPickupSettlementUiFilter, "periodKey" | "dateFrom" | "dateTo">
): { from?: string; to?: string } {
  const dates = resolveManualJournalListDateRange({
    periodKey: filter.periodKey,
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
  })
  return {
    ...(dates.dateFrom ? { from: dates.dateFrom } : {}),
    ...(dates.dateTo ? { to: dates.dateTo } : {}),
  }
}

export function isCollectorPickupMoreFilterActive(
  filter: Pick<CollectorPickupSettlementUiFilter, "periodKey" | "dateFrom" | "dateTo">
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

export function toCollectorPickupFinanceFilter(
  filter: CollectorPickupSettlementUiFilter
): FinanceFilterValues {
  const dates = resolveCollectorPickupSettlementDateRange(filter)
  return {
    ...(filter.branchId.trim() ? { branchId: filter.branchId.trim() } : {}),
    ...dates,
  }
}
