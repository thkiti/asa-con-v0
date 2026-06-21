import type { GlAccountListRow } from "@/lib/finance/gl-account-list"
import { isPettyCashGlAccount } from "@/lib/finance-ui/pav-pay-from-accounts"

/** Canonical petty-cash GL account code in COA import (เงินสดย่อย). */
export const PCV_PETTY_CASH_GL_ACCOUNT_CODE = "1011"

export type PcvPettyCashAccount = {
  id: string
  code: string
  name: string
}

export function resolvePcvPettyCashAccount(
  accounts: GlAccountListRow[]
): PcvPettyCashAccount | null {
  const byCode = accounts.find(
    (row) =>
      row.code === PCV_PETTY_CASH_GL_ACCOUNT_CODE &&
      row.isActive &&
      !row.deleted
  )
  if (byCode) {
    return { id: byCode.id, code: byCode.code, name: byCode.name }
  }

  const byHeuristic = accounts.find(
    (row) => row.isActive && !row.deleted && isPettyCashGlAccount(row)
  )
  if (!byHeuristic) return null
  return {
    id: byHeuristic.id,
    code: byHeuristic.code,
    name: byHeuristic.name,
  }
}

export function formatPcvPettyCashLockedLabel(code: string, name: string): string {
  const trimmedName = name.trim()
  if (trimmedName.includes("เงินสดย่อย")) return `${code} • Petty Cash`
  if (trimmedName.toLowerCase().includes("petty cash")) return `${code} • Petty Cash`
  return `${code} • ${trimmedName || "Petty Cash"}`
}
