import type { PaymentVoucherStatus } from "@/generated/prisma/client"

const STATUSES: PaymentVoucherStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "CONFIRMED",
  "POSTED",
  "CANCELLED",
]

export type PaymentVoucherListQuery = {
  status?: PaymentVoucherStatus
  branchId?: string
  search?: string
  dateFrom?: Date
  dateTo?: Date
  limit?: number
  offset?: number
}

export function parsePaymentVoucherListQuery(
  params: URLSearchParams
): PaymentVoucherListQuery {
  const filter: PaymentVoucherListQuery = {}

  const status = params.get("status")?.trim().toUpperCase()
  if (status && STATUSES.includes(status as PaymentVoucherStatus)) {
    filter.status = status as PaymentVoucherStatus
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
