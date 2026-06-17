export const ACCOUNT_DISPLAY_BULLET = "•"
export const ACCOUNT_DISPLAY_SEPARATOR = ` ${ACCOUNT_DISPLAY_BULLET} `

/** Reserved account-code column width (chart-of-account hierarchy; not data-driven). */
export const FINANCE_ACCOUNT_CODE_SLOT_CHARS = 8
export const FINANCE_ACCOUNT_CODE_WIDTH = "8ch"

/** Plain-text account field: `101 • สำรองตามกฎหมาย` */
export function formatAccountDisplay(
  accountCode: string | null | undefined,
  accountName: string | null | undefined
): string {
  const code = String(accountCode ?? "").trim()
  const name = String(accountName ?? "").trim()
  if (!code && !name) return "—"
  if (!code) return name
  if (!name) return code
  return `${code}${ACCOUNT_DISPLAY_SEPARATOR}${name}`
}
