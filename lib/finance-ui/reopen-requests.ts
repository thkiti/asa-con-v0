import type { ReopenRequestDetail } from "@/lib/finance/reopen-request-types"

export type { ReopenRequestDetail } from "@/lib/finance/reopen-request-types"

export type ReopenRequestsApiResult = {
  requests: ReopenRequestDetail[]
}

export type ReopenRequestApiResult = {
  request: ReopenRequestDetail
}

export function buildReopenRequestsPath(periodId: string): string {
  return `/finance/periods/${encodeURIComponent(periodId.trim())}/reopen-requests`
}

export type ReopenRequestAction = "APPROVE" | "REJECT" | "CANCEL"
