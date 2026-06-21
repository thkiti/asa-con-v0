import type { RevenueVoucherStatus } from "@/generated/prisma/client"

const STATUSES: RevenueVoucherStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "CONFIRMED",
  "POSTED",
  "CANCELLED",
]

export type RevenueVoucherListQuery = {
  legalEntityCode?: string
  status?: RevenueVoucherStatus
  branchId?: string
  search?: string
  dateFrom?: Date
  dateTo?: Date
  limit?: number
  offset?: number
}

export function parseRevenueVoucherListQuery(
  params: URLSearchParams
): RevenueVoucherListQuery {
  const filter: RevenueVoucherListQuery = {}

  const legalEntityCode = params.get("legalEntityCode")?.trim()
  if (legalEntityCode) filter.legalEntityCode = legalEntityCode

  const status = params.get("status")?.trim().toUpperCase()
  if (status && STATUSES.includes(status as RevenueVoucherStatus)) {
    filter.status = status as RevenueVoucherStatus
  }

  const branchId = params.get("branchId")?.trim()
  if (branchId) filter.branchId = branchId

  const search = params.get("search")?.trim()
  if (search) filter.search = search

  const dateFrom = params.get("dateFrom")?.trim()
  if (dateFrom) filter.dateFrom = new Date(dateFrom)

  const dateTo = params.get("dateTo")?.trim()
  if (dateTo) filter.dateTo = new Date(dateTo)

  const limit = params.get("limit")
  if (limit) filter.limit = Number(limit)

  const offset = params.get("offset")
  if (offset) filter.offset = Number(offset)

  return filter
}
