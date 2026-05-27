import type { ManualSnapshotScopeInput } from "@/lib/finance/reconciliation-snapshot-types"
import { normalizeDateRange, normalizeDayRange } from "@/lib/reporting/date-range"

type SnapshotBody = {
  branchId?: unknown
  from?: unknown
  to?: unknown
  periodKey?: unknown
  label?: unknown
  note?: unknown
}

function optionalTrimmedString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  const trimmed = String(value).trim()
  return trimmed || undefined
}

export function parseReconciliationSnapshotBody(
  body: SnapshotBody
): ManualSnapshotScopeInput {
  const branchId = optionalTrimmedString(body.branchId)
  const periodKey = optionalTrimmedString(body.periodKey)
  const label = optionalTrimmedString(body.label)
  const note = optionalTrimmedString(body.note)

  const fromRaw = optionalTrimmedString(body.from)
  const toRaw = optionalTrimmedString(body.to)

  let fromDate: Date | undefined
  let toDate: Date | undefined

  if (fromRaw) {
    fromDate = normalizeDayRange(fromRaw).start
  }

  if (toRaw) {
    toDate = normalizeDayRange(toRaw).start
  }

  if (fromDate && toDate) {
    normalizeDateRange({ from: fromDate, to: toDate })
  }

  return {
    branchId,
    fromDate,
    toDate,
    periodKey,
    label,
    note,
  }
}
