import type { GlAccountListRow } from "@/lib/finance/gl-account-list"
import {
  filterPavPayFromAccountOptions,
  formatPavPayFromOptionLabel,
  PAV_PAY_FROM_ACCOUNT_CODES,
  shortenPavPayFromDisplayName,
} from "@/lib/finance-ui/pav-pay-from-accounts"

export type RevReceiveToAccountOption = {
  id: string
  code: string
  name: string
}

/** REV receive-to dropdown — same bank/current whitelist as PAV pay-from. */
export const REV_RECEIVE_TO_ACCOUNT_CODES = PAV_PAY_FROM_ACCOUNT_CODES

export function filterRevReceiveToAccountOptions(
  accounts: GlAccountListRow[]
): RevReceiveToAccountOption[] {
  return filterPavPayFromAccountOptions(accounts)
}

export function formatRevReceiveToOptionLabel(code: string, name: string): string {
  return formatPavPayFromOptionLabel(code, name)
}

export function shortenRevReceiveToDisplayName(name: string): string {
  return shortenPavPayFromDisplayName(name)
}
