import type { PettyCashVoucherStatus } from "@/generated/prisma/client"

const STATUSES: PettyCashVoucherStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "CONFIRMED",
  "POSTED",
  "CANCELLED",
]

export type PettyCashVoucherListQuery = {
  status?: PettyCashVoucherStatus
  branchId?: string
  search?: string
  postingState?: "posted" | "unposted"
  dateFrom?: Date
  dateTo?: Date
  limit?: number
  offset?: number
}

export function parsePettyCashVoucherListQuery(
  params: URLSearchParams
): PettyCashVoucherListQuery {
  const filter: PettyCashVoucherListQuery = {}

  const status = params.get("status")?.trim().toUpperCase()
  if (status && STATUSES.includes(status as PettyCashVoucherStatus)) {
    filter.status = status as PettyCashVoucherStatus
  }

  const branchId = params.get("branchId")?.trim()
  if (branchId) filter.branchId = branchId

  const search = params.get("search")?.trim()
  if (search) filter.search = search

  const postingStateRaw = params.get("postingState")?.trim().toLowerCase()
  if (postingStateRaw === "posted" || postingStateRaw === "unposted") {
    filter.postingState = postingStateRaw
  }

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
