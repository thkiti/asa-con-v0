import type { ManualJournalEntryListFilterInput } from "@/lib/finance-ui/manual-journal-entries"
import { fetchManualJournalEntries } from "@/lib/finance-ui/manual-journal-entries"
import type { ManualJournalEntryListResult } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read-types"
import type { ManualJournalEntryPostingVerification } from "@/lib/finance/manual-journal-entry/manual-journal-entry-posting-verification-types"

export type OpeningBalanceListFilterInput = Omit<
  ManualJournalEntryListFilterInput,
  "entryType"
>

async function parseError(res: Response): Promise<string> {
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

export async function fetchOpeningBalanceEntries(
  filter: OpeningBalanceListFilterInput = {}
): Promise<ManualJournalEntryListResult> {
  return fetchManualJournalEntries({
    ...filter,
    entryType: "OPENING_BALANCE",
  })
}

export async function fetchOpeningBalancePostingVerification(
  entryId: string
): Promise<ManualJournalEntryPostingVerification> {
  const res = await fetch(
    `/api/finance/manual-journal-entries/${encodeURIComponent(entryId)}/posting-verification`
  )
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as {
    verification: ManualJournalEntryPostingVerification
  }
  return body.verification
}
