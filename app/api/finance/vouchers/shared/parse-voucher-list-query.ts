export type FinanceVoucherListQuery = {
  voucherNo?: string
  refNo?: string
  refType?: string
  periodKey?: string
  dateFrom?: Date
  dateTo?: Date
  limit?: number
  offset?: number
}

export function parseFinanceVoucherListQuery(
  params: URLSearchParams
): FinanceVoucherListQuery {
  const filter: FinanceVoucherListQuery = {}

  const voucherNo = params.get("voucherNo")?.trim()
  if (voucherNo) filter.voucherNo = voucherNo

  const refNo = params.get("refNo")?.trim()
  if (refNo) filter.refNo = refNo

  const refType = params.get("refType")?.trim()
  if (refType) filter.refType = refType

  const periodKey = params.get("periodKey")?.trim()
  if (periodKey) filter.periodKey = periodKey

  const dateFrom = params.get("dateFrom")?.trim() ?? params.get("from")?.trim()
  if (dateFrom) filter.dateFrom = new Date(dateFrom)

  const dateTo = params.get("dateTo")?.trim() ?? params.get("to")?.trim()
  if (dateTo) filter.dateTo = new Date(dateTo)

  const limit = params.get("limit")
  if (limit) filter.limit = Number(limit)

  const offset = params.get("offset")
  if (offset) filter.offset = Number(offset)

  return filter
}
