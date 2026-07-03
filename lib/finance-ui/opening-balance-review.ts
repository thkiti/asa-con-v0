import type { OpeningBalanceReviewResult } from "@/lib/finance/opening-balance-review-types"

export type { OpeningBalanceReviewResult } from "@/lib/finance/opening-balance-review-types"

export type OpeningBalanceReviewApiResult = {
  review: OpeningBalanceReviewResult
}

export {
  isOpeningBalancePeriodKey,
  OPENING_BALANCE_PERIOD_KEY,
} from "@/lib/finance/opening-balance-period"

export function buildOpeningBalanceReviewPath(periodId: string): string {
  return `/finance/periods/${encodeURIComponent(periodId)}/opening-balance-review`
}

export function buildOpeningBalanceJournalPath(entryId: string): string {
  return `/finance/opening-balance/${encodeURIComponent(entryId)}`
}

export function buildTrialBalanceReportPath(periodKey: string): string {
  const params = new URLSearchParams({ periodKey: periodKey.trim() })
  return `/finance/reports/trial-balance?${params.toString()}`
}

export function buildGeneralLedgerReportPath(periodKey: string): string {
  const params = new URLSearchParams({ periodKey: periodKey.trim() })
  return `/finance/reports/general-ledger?${params.toString()}`
}

export function formatOpeningBalanceReviewStatusLabel(
  status: OpeningBalanceReviewResult["status"]
): string {
  return status === "READY" ? "Ready to lock" : "Blocked"
}

export function formatOpeningBalanceJournalStatusLabel(
  status: string | null
): string {
  if (!status) return "Not imported"
  if (status === "POSTED") return "Posted"
  return status
}

async function parseFetchError(res: Response): Promise<string> {
  let message = res.statusText || "Request failed"
  try {
    const body = (await res.json()) as { error?: string; code?: string }
    if (body.error) {
      message = body.code ? `${body.error} (${body.code})` : body.error
    }
  } catch {
    // keep statusText
  }
  return message
}

export async function fetchOpeningBalanceReview(
  periodId: string
): Promise<OpeningBalanceReviewApiResult> {
  const res = await fetch(
    `/api/finance/periods/${encodeURIComponent(periodId)}/opening-balance-review`
  )
  if (!res.ok) {
    throw new Error(await parseFetchError(res))
  }
  return res.json() as Promise<OpeningBalanceReviewApiResult>
}
