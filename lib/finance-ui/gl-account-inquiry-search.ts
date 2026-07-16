import { compareGlAccountCodes } from "@/lib/finance/gl-account-code-order"
import type { GlAccountListRow } from "@/lib/finance/gl-account-list"

const THAI_LETTER = /[\u0E00-\u0E7F]/
const LATIN_LETTER = /[A-Za-z]/

export function isNumericOnlyGlAccountSearch(search: string): boolean {
  const q = search.trim()
  return q.length > 0 && /^\d+$/.test(q)
}

export function hasGlAccountNameLetterSearch(search: string): boolean {
  const q = search.trim()
  return LATIN_LETTER.test(q) || THAI_LETTER.test(q)
}

function nameMatches(accountName: string, query: string): boolean {
  const name = accountName.trim()
  const q = query.trim()
  if (!name || !q) return false
  if (name.toLowerCase().includes(q.toLowerCase())) return true
  if (THAI_LETTER.test(q) && name.includes(q)) return true
  return false
}

/** Lower rank = higher priority. Null = no match. */
export function glAccountInquiryMatchRank(
  account: Pick<GlAccountListRow, "code" | "name">,
  search: string
): number | null {
  const q = search.trim()
  if (!q) return 0

  const { code, name } = account

  if (isNumericOnlyGlAccountSearch(q)) {
    if (code === q) return 0
    if (code.startsWith(q)) return 1
    return null
  }

  if (code === q) return 0
  const digitPrefix = q.match(/^\d+/)?.[0]
  if (digitPrefix && code.startsWith(digitPrefix)) return 1
  if (nameMatches(name, q)) return 2
  return null
}

export function filterAndSortGlAccountsForInquiry(
  accounts: GlAccountListRow[],
  search: string
): GlAccountListRow[] {
  const q = search.trim()
  if (!q) {
    return [...accounts].sort((a, b) => compareGlAccountCodes(a.code, b.code))
  }

  return accounts
    .map((account) => ({
      account,
      rank: glAccountInquiryMatchRank(account, q),
    }))
    .filter(
      (row): row is { account: GlAccountListRow; rank: number } => row.rank !== null
    )
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      return compareGlAccountCodes(a.account.code, b.account.code)
    })
    .map((row) => row.account)
}
