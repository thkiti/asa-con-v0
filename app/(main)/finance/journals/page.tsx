import { redirect } from "next/navigation"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function FinanceJournalsAliasPage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item)
    } else {
      query.set(key, value)
    }
  }
  const suffix = query.toString()
  redirect(suffix ? `/finance/vouchers?${suffix}` : "/finance/vouchers")
}
