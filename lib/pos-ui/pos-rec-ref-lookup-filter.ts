export type PosRecRefLookupDocType = "" | "REC" | "REF"

export type PosRecRefLookupFilter = {
  branchId?: string
  periodKey?: string
  from?: string
  to?: string
  docType?: PosRecRefLookupDocType
  documentNo?: string
}

export const POS_REC_REF_LOOKUP_DOC_TYPE_OPTIONS: ReadonlyArray<{
  value: PosRecRefLookupDocType
  label: string
}> = [
  { value: "", label: "All" },
  { value: "REC", label: "REC" },
  { value: "REF", label: "REF" },
]

const PERIOD_KEY_PATTERN = /^(\d{4})-(\d{2})$/

export function resolvePosRecRefLookupDateRange(
  filter: Pick<PosRecRefLookupFilter, "periodKey" | "from" | "to">
): { dateFrom?: string; dateTo?: string } {
  const from = filter.from?.trim()
  const to = filter.to?.trim()
  if (from || to) {
    return {
      ...(from ? { dateFrom: from } : {}),
      ...(to ? { dateTo: to } : {}),
    }
  }

  const periodKey = filter.periodKey?.trim() ?? ""
  const match = PERIOD_KEY_PATTERN.exec(periodKey)
  if (!match) return {}

  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return {}
  }

  const lastDay = new Date(year, month, 0).getDate()
  const mm = String(month).padStart(2, "0")
  return {
    dateFrom: `${year}-${mm}-01`,
    dateTo: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  }
}

export const emptyPosRecRefLookupFilter = (): PosRecRefLookupFilter => ({})
