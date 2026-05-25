import { normalizeDateRange, normalizeDayRange } from "@/lib/reporting/date-range"

export type ReconciliationFilterParams = {
  get(name: string): string | null
}

export function parseReconciliationFilter(
  params: ReconciliationFilterParams
): { branchId?: string; from?: string; to?: string } {
  const branchRaw = params.get("branchId")
  const branchId = branchRaw?.trim() ? branchRaw.trim() : undefined

  const fromRaw = params.get("from")
  const toRaw = params.get("to")

  let from: string | undefined
  let to: string | undefined

  if (fromRaw?.trim()) {
    normalizeDayRange(fromRaw.trim())
    from = fromRaw.trim()
  }

  if (toRaw?.trim()) {
    normalizeDayRange(toRaw.trim())
    to = toRaw.trim()
  }

  if (from && to) {
    normalizeDateRange({ from, to })
  }

  return { branchId, from, to }
}
