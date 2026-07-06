import type { BankStatementStatus } from "@/lib/finance/bank-statement/bank-statement-types"
import type { BankStatementRow } from "@/lib/finance/bank-statement"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import {
  isAccountingPeriodKeyInList,
  pickLatestAccountingPeriodKey,
  sortAccountingPeriodsDesc,
} from "@/lib/finance-ui/accounting-period-filter"

/** Ascending by periodKey — oldest first (workflow order). */
export function sortAccountingPeriodsAsc(
  periods: AccountingPeriodRow[]
): AccountingPeriodRow[] {
  return sortAccountingPeriodsDesc(periods).slice().reverse()
}

export function pickFirstAccountingPeriodKey(
  periods: AccountingPeriodRow[]
): string | null {
  return sortAccountingPeriodsAsc(periods)[0]?.periodKey ?? null
}

export function isBankCashCheckPeriodCompleted(
  status: BankStatementStatus | undefined
): boolean {
  return status === "READY"
}

/**
 * One status per periodKey for a bank account.
 * When multiple statements exist for the same period, prefer actionable (non-READY).
 */
export function buildBankCashCheckStatementStatusByPeriod(
  statements: readonly Pick<BankStatementRow, "periodKey" | "status">[]
): Map<string, BankStatementStatus> {
  const byPeriod = new Map<string, BankStatementStatus>()

  for (const statement of statements) {
    const existing = byPeriod.get(statement.periodKey)
    if (!existing) {
      byPeriod.set(statement.periodKey, statement.status)
      continue
    }
    if (existing === "READY" && statement.status !== "READY") {
      byPeriod.set(statement.periodKey, statement.status)
    }
  }

  return byPeriod
}

export type ResolveBankCashCheckPeriodResult = {
  periodKey: string | null
  allPeriodsCompleted: boolean
}

/**
 * Index of the latest period in a consecutive READY chain from the first
 * accounting period. Returns -1 when no period has been completed yet.
 */
export function findLatestConsecutiveReadyPeriodIndex(
  sortedPeriods: AccountingPeriodRow[],
  statusByPeriod: Map<string, BankStatementStatus | undefined>
): number {
  let lastReadyIndex = -1

  for (let index = 0; index < sortedPeriods.length; index += 1) {
    const periodKey = sortedPeriods[index]!.periodKey
    if (!isBankCashCheckPeriodCompleted(statusByPeriod.get(periodKey))) {
      break
    }
    lastReadyIndex = index
  }

  return lastReadyIndex
}

/**
 * Bank Cash Check default period:
 * - explicit valid URL periodKey wins
 * - otherwise next accounting period after the latest consecutive READY chain
 *   from the first operating period (missing/NEW/DRAFT breaks the chain)
 * - if every listed period is READY, use the latest period
 */
export function resolveBankCashCheckPeriodFilterKey(input: {
  periods: AccountingPeriodRow[]
  urlPeriodKey?: string | null
  statementStatusByPeriodKey?: Map<string, BankStatementStatus | undefined>
}): ResolveBankCashCheckPeriodResult {
  const urlKey = input.urlPeriodKey?.trim() ?? ""
  if (urlKey && isAccountingPeriodKeyInList(urlKey, input.periods)) {
    return { periodKey: urlKey, allPeriodsCompleted: false }
  }

  if (input.periods.length === 0) {
    return { periodKey: null, allPeriodsCompleted: false }
  }

  const statusByPeriod = input.statementStatusByPeriodKey ?? new Map()
  const sortedAsc = sortAccountingPeriodsAsc(input.periods)
  const lastReadyIndex = findLatestConsecutiveReadyPeriodIndex(sortedAsc, statusByPeriod)
  const nextIndex = lastReadyIndex + 1

  if (nextIndex >= sortedAsc.length) {
    return {
      periodKey: pickLatestAccountingPeriodKey(input.periods),
      allPeriodsCompleted: lastReadyIndex >= 0,
    }
  }

  return {
    periodKey: sortedAsc[nextIndex]!.periodKey,
    allPeriodsCompleted: false,
  }
}
