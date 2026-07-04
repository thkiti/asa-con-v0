import type { BankStatementStatus } from "./bank-statement-types"
import type { BankStatementRow } from "./bank-statement-types"

function isEditableBankStatementStatus(status: BankStatementStatus): boolean {
  return status === "NEW" || status === "DRAFT"
}

/**
 * One workspace row per entity + bank account + period.
 * When legacy duplicates exist, prefer READY (source of truth), else earliest NEW/DRAFT.
 */
export function pickBankStatementWorkspaceRow(
  items: readonly BankStatementRow[]
): BankStatementRow | null {
  if (items.length === 0) return null
  if (items.length === 1) return items[0] ?? null

  const sorted = [...items].sort((a, b) => a.statementNo.localeCompare(b.statementNo))
  const ready = sorted.filter((item) => item.status === "READY")
  if (ready.length > 0) {
    return ready[0] ?? null
  }

  const editable = sorted.filter((item) => isEditableBankStatementStatus(item.status))
  if (editable.length > 0) {
    return editable[0] ?? null
  }

  return sorted[0] ?? null
}
