import type {
  BankStatementDetail,
  BankStatementLineInput,
  BankStatementStatus,
} from "@/lib/finance/bank-statement/bank-statement-types"
import type { BankStatementRow } from "@/lib/finance/bank-statement"
import type { AmountMatchLine, AmountMatchSummary } from "@/lib/finance/bank-statement-match"
import {
  createBankStatement,
  fetchBankStatement,
  fetchBankStatements,
  patchBankStatement,
} from "@/lib/finance-ui/bank-statements"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"

export type QuickStatementLine = {
  key: string
  serverId?: string
  depositAmount: string
  withdrawalAmount: string
  transactionDate: string
  description: string
  chequeNumber: string
  showDetails: boolean
}

export function defaultStatementDateForPeriod(periodKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(periodKey.trim())
  if (!match) return ""
  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}`
}

export function emptyQuickStatementLine(): QuickStatementLine {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    depositAmount: "",
    withdrawalAmount: "",
    transactionDate: "",
    description: "",
    chequeNumber: "",
    showDetails: false,
  }
}

export function quickLineHasAmount(line: QuickStatementLine): boolean {
  const deposit = line.depositAmount.trim()
  const withdrawal = line.withdrawalAmount.trim()
  return Boolean(deposit || withdrawal)
}

export function normalizeQuickLineSideAmount(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function resolveQuickLineTransactionDate(
  line: QuickStatementLine,
  statementDate: string
): string {
  return line.transactionDate.trim() || statementDate.trim()
}

export function buildQuickStatementPatchPayload(
  detail: BankStatementDetail,
  lines: QuickStatementLine[]
): {
  statementDate: string
  openingBalance: string
  closingBalance: string
  status: BankStatementStatus
  lines: BankStatementLineInput[]
} {
  const persistableLines = lines.filter(quickLineHasAmount)

  return {
    statementDate: detail.statementDate,
    openingBalance: detail.openingBalance,
    closingBalance: detail.closingBalance,
    status: detail.status === "NEW" ? "DRAFT" : detail.status,
    lines: persistableLines.map((line, index) => ({
      lineNo: index + 1,
      transactionDate: resolveQuickLineTransactionDate(line, detail.statementDate),
      description: line.description.trim(),
      chequeNumber: line.chequeNumber.trim() || null,
      depositAmount: normalizeQuickLineSideAmount(line.depositAmount),
      withdrawalAmount: normalizeQuickLineSideAmount(line.withdrawalAmount),
      runningBalance: "0",
    })),
  }
}

export function mapDetailToQuickLines(detail: BankStatementDetail): QuickStatementLine[] {
  const rows = detail.lines ?? []
  if (rows.length === 0) return [emptyQuickStatementLine()]

  return rows.map((line) => ({
    key: line.id,
    serverId: line.id,
    depositAmount: line.depositAmount ?? "",
    withdrawalAmount: line.withdrawalAmount ?? "",
    transactionDate: line.transactionDate,
    description: line.description ?? "",
    chequeNumber: line.chequeNumber ?? "",
    showDetails: false,
  }))
}

export function quickLinesToMatchLines(lines: QuickStatementLine[]): AmountMatchLine[] {
  return lines
    .filter(quickLineHasAmount)
    .map((line) => ({
      id: line.serverId ?? line.key,
      depositAmount: line.depositAmount.trim() || "0.00",
      withdrawalAmount: line.withdrawalAmount.trim() || "0.00",
    }))
}

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

export async function findOrCreateBankStatementWorkspace(
  legalEntityCode: DocumentEntityCode,
  input: {
    periodKey: string
    bankAccountId: string
    openingBalance: string
    closingBalance: string
  }
): Promise<BankStatementDetail> {
  const list = await fetchBankStatements(legalEntityCode, {
    periodKey: input.periodKey,
    bankAccountId: input.bankAccountId,
  })

  const existing = pickBankStatementWorkspaceRow(list.items)
  if (existing) {
    const detail = await fetchBankStatement(legalEntityCode, existing.id)
    return detail.item
  }

  const created = await createBankStatement(legalEntityCode, {
    bankAccountId: input.bankAccountId,
    periodKey: input.periodKey,
    statementDate: defaultStatementDateForPeriod(input.periodKey),
    openingBalance: input.openingBalance,
    closingBalance: input.closingBalance,
    status: "NEW",
  })

  return created.item
}

export const COMPLETE_CHECK_DISABLED_TOOLTIP =
  "Resolve unmatched statement amounts before completing."

function normalizeLineForCompare(line: {
  depositAmount: string | null
  withdrawalAmount: string | null
  transactionDate: string
  description: string
  chequeNumber: string | null
}): string {
  return JSON.stringify({
    depositAmount: line.depositAmount,
    withdrawalAmount: line.withdrawalAmount,
    transactionDate: line.transactionDate,
    description: line.description.trim(),
    chequeNumber: line.chequeNumber,
  })
}

export function areQuickLinesDirty(
  detail: BankStatementDetail,
  lines: QuickStatementLine[]
): boolean {
  const payload = buildQuickStatementPatchPayload(detail, lines)
  const current = payload.lines.map((line) =>
    normalizeLineForCompare({
      depositAmount: line.depositAmount ?? null,
      withdrawalAmount: line.withdrawalAmount ?? null,
      transactionDate: line.transactionDate,
      description: line.description,
      chequeNumber: line.chequeNumber ?? null,
    })
  )
  const saved = (detail.lines ?? []).map((line) =>
    normalizeLineForCompare({
      depositAmount: line.depositAmount,
      withdrawalAmount: line.withdrawalAmount,
      transactionDate: line.transactionDate,
      description: line.description ?? "",
      chequeNumber: line.chequeNumber,
    })
  )
  return JSON.stringify(current) !== JSON.stringify(saved)
}

export function isQuickStatementFullyMatched(
  lines: QuickStatementLine[],
  matchSummary: AmountMatchSummary
): boolean {
  const amountLines = lines.filter(quickLineHasAmount)
  if (amountLines.length === 0) return false
  return matchSummary.unmatchedStatementLineIds.length === 0
}

export async function saveQuickStatementLines(
  legalEntityCode: DocumentEntityCode,
  detail: BankStatementDetail,
  lines: QuickStatementLine[]
): Promise<BankStatementDetail> {
  const payload = buildQuickStatementPatchPayload(detail, lines)

  await patchBankStatement(legalEntityCode, detail.id, payload)

  const refreshed = await fetchBankStatement(legalEntityCode, detail.id)
  return refreshed.item
}

export async function completeBankStatementCheck(
  legalEntityCode: DocumentEntityCode,
  detail: BankStatementDetail,
  lines: QuickStatementLine[]
): Promise<BankStatementDetail> {
  let current = detail
  if (areQuickLinesDirty(detail, lines)) {
    current = await saveQuickStatementLines(legalEntityCode, detail, lines)
  }

  await patchBankStatement(legalEntityCode, current.id, { status: "READY" })

  const refreshed = await fetchBankStatement(legalEntityCode, current.id)
  return refreshed.item
}
