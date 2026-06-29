import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ journalEntryId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function FinanceJournalEntryAliasPage({
  params,
  searchParams,
}: PageProps) {
  const { journalEntryId } = await params
  const queryParams = await searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(queryParams)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item)
    } else {
      query.set(key, value)
    }
  }
  const suffix = query.toString()
  const target = `/finance/journal-entries/${encodeURIComponent(journalEntryId)}`
  redirect(suffix ? `${target}?${suffix}` : target)
}
