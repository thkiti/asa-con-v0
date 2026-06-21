import type { GlAccountListRow } from "@/lib/finance/gl-account-list"

export type PavPayFromAccountOption = {
  id: string
  code: string
  name: string
}

/** PAV pay-from dropdown — fixed bank accounts only (UI whitelist). */
export const PAV_PAY_FROM_ACCOUNT_CODES = ["1021001", "1021002", "1021003"] as const

/**
 * Petty-cash GL accounts are excluded from PAV pay-from choices.
 * PCV (Petty Cash Voucher) owns petty-cash disbursements.
 *
 * TODO: Replace name/code heuristics with an explicit COA pay-from eligibility flag
 * when the chart models bank/current vs petty-cash control accounts.
 */
export function isPettyCashGlAccount(account: {
  code: string
  name: string
}): boolean {
  const name = account.name.trim().toLowerCase()
  if (!name) return false
  if (name.includes("petty cash") || name.includes("petty-cash") || name.includes("pettycash")) {
    return true
  }
  if (name.includes("เงินสดย่อย")) {
    return true
  }
  return false
}

export function filterPavPayFromAccountOptions(
  accounts: GlAccountListRow[]
): PavPayFromAccountOption[] {
  const byCode = new Map(
    accounts
      .filter((account) => account.isActive && !account.deleted)
      .map((account) => [account.code, account])
  )

  return PAV_PAY_FROM_ACCOUNT_CODES.flatMap((code) => {
    const account = byCode.get(code)
    if (!account) return []
    return [
      {
        id: account.id,
        code: account.code,
        name: account.name,
      },
    ]
  })
}

/** Shorten bank account name for dropdown display only. */
export function shortenPavPayFromDisplayName(name: string): string {
  const trimmed = name.trim()
  const shortened = trimmed.replace(/^เงินฝากธนาคาร[^-]+-\s*บัญชี\s*/u, "").trim()
  return shortened || trimmed
}

export function formatPavPayFromOptionLabel(code: string, name: string): string {
  return `${code} • ${shortenPavPayFromDisplayName(name)}`
}
