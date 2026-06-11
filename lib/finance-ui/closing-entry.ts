import type {
  ClosingEntryStatus,
  PreviewClosingEntryResult,
} from "@/lib/finance/closing-entry-types"
import type { PeriodFetchErrorBody } from "./period-errors"

export type ClosingEntryPreviewApiResult = {
  preview: PreviewClosingEntryResult
}

export type ClosingEntryPostApiResult = {
  posted: {
    posted: boolean
    reason?: "NOT_REQUIRED"
    voucherId?: string
    voucherNo?: string
    journalEntryId?: string
    netIncome: string
    lineCount: number
    alreadyPosted: boolean
  }
}

async function throwFetchError(res: Response): Promise<never> {
  let message = res.statusText || "Request failed"
  let body: PeriodFetchErrorBody = {}
  try {
    body = (await res.json()) as PeriodFetchErrorBody
    if (body.error) message = body.error
    else if (body.message) message = body.message
  } catch {
    // keep statusText
  }
  const err = new Error(message) as Error & { code?: string; status?: number }
  err.code = body.code
  err.status = res.status
  throw err
}

export function buildClosingEntryPath(periodId: string): string {
  return `/finance/periods/${encodeURIComponent(periodId)}/closing-entry`
}

export async function fetchClosingEntryPreview(
  periodId: string
): Promise<ClosingEntryPreviewApiResult> {
  const res = await fetch(
    `/api/finance/periods/${encodeURIComponent(periodId)}/closing-entry/preview`
  )
  if (!res.ok) {
    await throwFetchError(res)
  }
  return (await res.json()) as ClosingEntryPreviewApiResult
}

export async function postClosingEntryForPeriod(
  periodId: string
): Promise<ClosingEntryPostApiResult> {
  const res = await fetch(
    `/api/finance/periods/${encodeURIComponent(periodId)}/closing-entry`,
    { method: "POST" }
  )
  if (!res.ok) {
    await throwFetchError(res)
  }
  return (await res.json()) as ClosingEntryPostApiResult
}

export function formatClosingEntryStatus(entry: ClosingEntryStatus | null): string {
  if (!entry) {
    return "None"
  }
  if (entry.isActive) {
    return `Active (${entry.voucherNo})`
  }
  if (entry.isReversed) {
    return `Reversed (${entry.voucherNo})`
  }
  return entry.voucherNo
}
