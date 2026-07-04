"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AccountingPeriodSelect } from "@/components/finance/AccountingPeriodSelect"
import { BankCashCheckStatusDot } from "@/components/finance/bank-cash/BankCashCheckStatusDot"
import { BankStatementQuickPanel, type MatchedJournalLineRef } from "@/components/finance/bank-cash/BankStatementQuickPanel"
import { GeneralLedgerRefLink } from "@/components/finance/GeneralLedgerRefLink"
import type { BankCashJournalResult } from "@/lib/finance/bank-cash-journal"
import type { BankAccountRow } from "@/lib/finance/bank-account"
import type { BankStatementDetail } from "@/lib/finance/bank-statement/bank-statement-types"
import {
  formatGroupedMatchTooltip,
  isGroupedMatch,
  matchGroupForJournalLine,
  matchStatementLinesToJournal,
} from "@/lib/finance/bank-statement-match"
import type { AmountMatchSummary } from "@/lib/finance/bank-statement-match"
import { fetchBankAccounts, formatBankAccountPickerLabel } from "@/lib/finance-ui/bank-accounts"
import { buildFinanceScopeSearchParams } from "@/lib/finance-ui/accounting-period-filter"
import {
  completeBankStatementCheck,
  emptyQuickStatementLine,
  findOrCreateBankStatementWorkspace,
  isQuickStatementFullyMatched,
  mapDetailToQuickLines,
  quickLinesToMatchLines,
  saveQuickStatementLines,
  type QuickStatementLine,
} from "@/lib/finance-ui/bank-cash-workspace"
import { fetchBankCashJournal } from "@/lib/finance-ui/bank-cash-journal"
import { useFinanceEntityPathBuilder, useFinanceLegalEntityScope } from "@/lib/finance-ui/use-finance-legal-entity-scope"
import { useBankCashCheckPeriodFilter } from "@/lib/finance-ui/use-bank-cash-check-period-filter"
import {
  formatAmount,
  formatBankCashCheckDayMonth,
} from "@/lib/finance-ui/format"
import {
  financeDiffBalanced,
  financeMemo,
  financeNumber,
  financeTable,
  financeTableCompact,
  financeTableScroll,
  financeTh,
  financeThRight,
  voucherInquiryFilterBar,
  voucherInquiryFilterSelect,
} from "@/lib/finance-ui/finance-visual-classes"
import { formatEntityContextTitle } from "@/lib/legal-entity/context-title"
import { themeInlineError, themeLabel, themeTextSecondary } from "@/lib/theme/theme-classes"

const BANK_CASH_RETURN_TO = "/finance/bank-cash"

const journalTableClass = `${financeTable} ${financeTableCompact}`
const journalDateCellClass = `${financeMemo} w-[2.75rem] whitespace-nowrap px-1.5 py-0.5 tabular-nums`
const journalDateHeaderClass = `${financeTh} w-[2.75rem] whitespace-nowrap px-1.5 py-1`
const journalVoucherCellClass = `${financeMemo} max-w-[5.75rem] px-1.5 py-0.5`
const journalVoucherHeaderClass = `${financeTh} w-[5.75rem] max-w-[5.75rem] px-1.5 py-1`
const journalAmountCellClass = `${financeNumber} min-w-[6rem] whitespace-nowrap px-1.5 py-0.5 tabular-nums`
const journalBalanceCellClass = `${financeNumber} ${financeDiffBalanced} min-w-[9.5rem] whitespace-nowrap px-1.5 py-0.5 tabular-nums`
const journalBalanceHeaderClass = `${financeThRight} min-w-[9.5rem] whitespace-nowrap px-1.5 py-1`

const summaryBoxClass =
  "rounded border border-zinc-200 bg-white px-2 py-2 dark:border-border dark:bg-card"

type BankCashSummaryItemProps = {
  label: string
  value: string
  testId?: string
  valueClassName?: string
  statusDot?: ReactNode
}

function BankCashSummaryItem({
  label,
  value,
  testId,
  valueClassName = "text-foreground",
  statusDot,
}: BankCashSummaryItemProps) {
  return (
    <div className={summaryBoxClass}>
      <div className="flex items-center justify-center gap-1.5">
        <p className={`text-xs ${themeTextSecondary}`}>{label}</p>
        {statusDot}
      </div>
      <p
        className={`mt-1 text-center text-sm font-bold tabular-nums ${valueClassName}`.trim()}
        data-testid={testId}
      >
        {value}
      </p>
    </div>
  )
}

function sumLineAmounts(
  lines: BankCashJournalResult["lines"],
  field: "depositAmount" | "withdrawalAmount"
): string {
  let total = 0
  for (const line of lines) {
    total += Number.parseFloat(line[field]) || 0
  }
  return total.toFixed(2)
}

function journalRowClass(journalLineId: string, matchedJournalLineIds: string[]): string {
  if (matchedJournalLineIds.includes(journalLineId)) {
    return "opacity-[0.85] font-normal"
  }
  return ""
}

function journalRowTitle(
  journalLineId: string,
  matchSummary: AmountMatchSummary,
  journalLines: BankCashJournalResult["lines"]
): string | undefined {
  const group = matchGroupForJournalLine(matchSummary, journalLineId)
  if (!group || !isGroupedMatch(group)) return undefined

  const labels = Object.fromEntries(
    journalLines.map((line) => [line.journalLineId, line.entryNo])
  )
  return formatGroupedMatchTooltip(group, labels)
}

export function BankCashJournalPage() {
  const legalEntityCode = useFinanceLegalEntityScope()
  const entityPath = useFinanceEntityPathBuilder()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const bankAccountId = useMemo(
    () => searchParams.get("bankAccountId")?.trim() ?? "",
    [searchParams]
  )

  const {
    periodKey,
    setPeriodKey,
    periods,
    loading: periodsLoading,
    hasPeriods,
    emptyMessage,
    allPeriodsCompleted,
  } = useBankCashCheckPeriodFilter(bankAccountId)

  const setBankAccountId = useCallback(
    (nextBankAccountId: string) => {
      const params = buildFinanceScopeSearchParams({
        searchParams,
        legalEntityCode,
        periodKey,
      })
      const normalized = nextBankAccountId.trim()
      if (normalized) {
        params.set("bankAccountId", normalized)
      } else {
        params.delete("bankAccountId")
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [legalEntityCode, pathname, periodKey, router, searchParams]
  )
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  const [journal, setJournal] = useState<BankCashJournalResult | null>(null)
  const [statementDetail, setStatementDetail] = useState<BankStatementDetail | null>(null)
  const [quickLines, setQuickLines] = useState<QuickStatementLine[]>([emptyQuickStatementLine()])
  const [loading, setLoading] = useState(false)
  const [statementLoading, setStatementLoading] = useState(false)
  const [statementSaving, setStatementSaving] = useState(false)
  const [statementCompleting, setStatementCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statementError, setStatementError] = useState<string | null>(null)

  const displayPeriodKey = periodKey ?? "—"
  const readOnly = statementDetail?.status === "READY"

  const pageTitle = formatEntityContextTitle(
    legalEntityCode,
    "Bank Cash Check",
    displayPeriodKey
  )

  const selectedAccount = useMemo(
    () => bankAccounts.find((account) => account.id === bankAccountId) ?? null,
    [bankAccounts, bankAccountId]
  )

  const periodTotals = useMemo(() => {
    if (!journal) {
      return { deposits: "0.00", withdrawals: "0.00" }
    }
    return {
      deposits: sumLineAmounts(journal.lines, "depositAmount"),
      withdrawals: sumLineAmounts(journal.lines, "withdrawalAmount"),
    }
  }, [journal])

  const matchSummary = useMemo(() => {
    if (!journal) {
      return {
        matches: [],
        groups: [],
        matchedStatementLineIds: [],
        matchedJournalLineIds: [],
        unmatchedStatementLineIds: [],
        unmatchedJournalLineIds: [],
      }
    }

    return matchStatementLinesToJournal(
      quickLinesToMatchLines(quickLines),
      journal.lines.map((line) => ({
        id: line.journalLineId,
        depositAmount: line.depositAmount,
        withdrawalAmount: line.withdrawalAmount,
      }))
    )
  }, [journal, quickLines])

  const matchedJournalLines = useMemo((): Record<string, MatchedJournalLineRef> => {
    if (!journal) return {}
    return Object.fromEntries(
      journal.lines.map((line) => [
        line.journalLineId,
        {
          journalLineId: line.journalLineId,
          journalEntryId: line.journalEntryId,
          entryNo: line.entryNo,
          sourceRef: line.sourceRef,
          sourceRefType: line.sourceRefType,
        },
      ])
    )
  }, [journal])

  useEffect(() => {
    let cancelled = false
    setAccountsLoading(true)
    void fetchBankAccounts(legalEntityCode)
      .then((result) => {
        if (cancelled) return
        setBankAccounts(result.items)
        setAccountsError(null)
        if (!bankAccountId && result.items.length === 1) {
          setBankAccountId(result.items[0].id)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setAccountsError(err instanceof Error ? err.message : "Failed to load bank accounts")
        setBankAccounts([])
      })
      .finally(() => {
        if (!cancelled) setAccountsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [legalEntityCode, bankAccountId, setBankAccountId])

  const loadWorkspace = useCallback(async () => {
    if (!periodKey) {
      setError(emptyMessage)
      setJournal(null)
      setStatementDetail(null)
      setQuickLines([emptyQuickStatementLine()])
      return
    }
    if (!bankAccountId) {
      setError("Select a bank account")
      setJournal(null)
      setStatementDetail(null)
      setQuickLines([emptyQuickStatementLine()])
      return
    }

    setLoading(true)
    setStatementLoading(true)
    setError(null)
    setStatementError(null)

    try {
      const journalResult = await fetchBankCashJournal(legalEntityCode, {
        periodKey,
        bankAccountId,
      })
      setJournal(journalResult.journal)

      const detail = await findOrCreateBankStatementWorkspace(legalEntityCode, {
        periodKey,
        bankAccountId,
        openingBalance: journalResult.journal.beginningBalance,
        closingBalance: journalResult.journal.endingBalance,
      })
      setStatementDetail(detail)
      setQuickLines(mapDetailToQuickLines(detail))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load bank cash check"
      setError(message)
      setJournal(null)
      setStatementDetail(null)
      setQuickLines([emptyQuickStatementLine()])
    } finally {
      setLoading(false)
      setStatementLoading(false)
    }
  }, [bankAccountId, emptyMessage, legalEntityCode, periodKey])

  useEffect(() => {
    if (!bankAccountId || accountsLoading || periodsLoading || !periodKey) return
    void loadWorkspace()
  }, [accountsLoading, bankAccountId, loadWorkspace, periodKey, periodsLoading])

  const canCompleteCheck = useMemo(
    () =>
      Boolean(statementDetail) &&
      statementDetail?.status !== "READY" &&
      isQuickStatementFullyMatched(quickLines, matchSummary),
    [matchSummary, quickLines, statementDetail]
  )

  const handleSaveStatement = async (): Promise<BankStatementDetail | null> => {
    if (!statementDetail) return null

    setStatementSaving(true)
    setStatementError(null)
    try {
      const saved = await saveQuickStatementLines(legalEntityCode, statementDetail, quickLines)
      setStatementDetail(saved)
      setQuickLines(mapDetailToQuickLines(saved))
      return saved
    } catch (err: unknown) {
      setStatementError(err instanceof Error ? err.message : "Failed to save statement amounts")
      return null
    } finally {
      setStatementSaving(false)
    }
  }

  const handleCompleteCheck = async () => {
    if (!statementDetail || !canCompleteCheck) return

    setStatementCompleting(true)
    setStatementError(null)
    try {
      const completed = await completeBankStatementCheck(
        legalEntityCode,
        statementDetail,
        quickLines
      )
      setStatementDetail(completed)
      setQuickLines(mapDetailToQuickLines(completed))
    } catch (err: unknown) {
      setStatementError(err instanceof Error ? err.message : "Failed to complete bank cash check")
    } finally {
      setStatementCompleting(false)
    }
  }

  const handleSaveStatementClick = () => {
    void handleSaveStatement()
  }

  const handleAddQuickLine = () => {
    setQuickLines((prev) => [...prev, emptyQuickStatementLine()])
  }

  return (
    <div className="space-y-6" data-testid="bank-cash-journal-page">
      <Link
        href={entityPath("/finance")}
        className={`text-sm print:hidden ${themeTextSecondary} underline underline-offset-2`}
      >
        ← Finance
      </Link>

      <h1
        className="text-2xl font-bold tracking-tight text-foreground"
        data-testid="entity-context-page-title"
      >
        {pageTitle}
      </h1>

      <p className={`text-sm ${themeTextSecondary}`}>
        Compare posted GL movements (system) with amounts from the paper bank statement. Enter
        statement amounts on the right — matched rows fade on both sides; unmatched amounts stay
        bold for investigation.
      </p>

      <section className={`${voucherInquiryFilterBar} bank-cash-check-filter-bar`}>
        <div className="finance-filter-field bank-cash-check-filter-period">
          <label htmlFor="bcj-period-key" className={themeLabel}>
            Period
          </label>
          <AccountingPeriodSelect
            id="bcj-period-key"
            className="finance-filter-control finance-filter-control--mono"
            periods={periods}
            value={periodKey}
            onChange={setPeriodKey}
            loading={periodsLoading}
            selectedLabelMode="periodKey"
            showEmptyHint={false}
            data-testid="bank-cash-period-key"
          />
        </div>

        <div className="finance-filter-field bank-cash-check-filter-bank-account">
          <label htmlFor="bcj-bank-account" className={themeLabel}>
            Bank account
          </label>
          <select
            id="bcj-bank-account"
            className={voucherInquiryFilterSelect}
            value={bankAccountId}
            onChange={(event) => setBankAccountId(event.target.value)}
            disabled={accountsLoading || bankAccounts.length === 0}
            data-testid="bank-cash-bank-account"
          >
            <option value="">
              {accountsLoading ? "Loading…" : "Select bank account"}
            </option>
            {bankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {formatBankAccountPickerLabel(account)}
              </option>
            ))}
          </select>
        </div>
      </section>

      {!periodsLoading && !hasPeriods ? (
        <p className={`text-sm ${themeTextSecondary}`} data-testid="bank-cash-no-periods">
          {emptyMessage}
        </p>
      ) : null}

      {!periodsLoading && hasPeriods && bankAccountId && allPeriodsCompleted ? (
        <p className={`text-sm ${themeTextSecondary}`} data-testid="bank-cash-all-periods-completed">
          All periods completed for this bank account.
        </p>
      ) : null}

      {accountsError ? (
        <p className={themeInlineError} data-testid="bank-cash-accounts-error">
          {accountsError}
        </p>
      ) : null}

      {!accountsLoading && bankAccounts.length === 0 ? (
        <p className={`text-sm ${themeTextSecondary}`} data-testid="bank-cash-no-accounts">
          No bank accounts configured.{" "}
          <Link href={entityPath("/finance/bank-accounts")} className="underline">
            Add a bank account
          </Link>{" "}
          to use this view.
        </p>
      ) : null}

      {error ? (
        <p className={themeInlineError} data-testid="bank-cash-error">
          {error}
        </p>
      ) : null}

      {selectedAccount && journal ? (
        <section className="space-y-4" data-testid="bank-cash-journal-result">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="bank-cash-summary-cards">
            <BankCashSummaryItem
              label="Beginning"
              value={formatAmount(journal.beginningBalance)}
              testId="bank-cash-beginning-balance"
            />
            <BankCashSummaryItem
              label="Deposits"
              value={formatAmount(periodTotals.deposits)}
              testId="bank-cash-deposits-total"
            />
            <BankCashSummaryItem
              label="Withdrawals"
              value={formatAmount(periodTotals.withdrawals)}
              testId="bank-cash-withdrawals-total"
            />
            <BankCashSummaryItem
              label="Ending Balance"
              value={formatAmount(journal.endingBalance)}
              testId="bank-cash-ending-balance"
              valueClassName={financeDiffBalanced}
              statusDot={
                statementDetail ? (
                  <BankCashCheckStatusDot
                    status={statementDetail.status}
                    testId="bank-cash-ending-balance-status"
                  />
                ) : null
              }
            />
          </div>

          <div
            className="grid grid-cols-1 gap-6 xl:grid-cols-2"
            data-testid="bank-cash-workspace-panels"
          >
            <section className="space-y-3" data-testid="bank-cash-journal-panel">
              <header>
                <h2 className="text-base font-medium text-zinc-900 dark:text-foreground">
                  Bank cash journal (system)
                </h2>
                <p className={`text-xs ${themeTextSecondary}`}>
                  Read-only posted GL movements for this bank account and period.
                </p>
              </header>

              {journal.lines.length === 0 ? (
                <p className={`text-sm ${themeTextSecondary}`} data-testid="bank-cash-empty">
                  No posted movements in this period.
                </p>
              ) : (
                <div className={financeTableScroll}>
                  <table className={journalTableClass} data-testid="bank-cash-lines-table">
                    <thead>
                      <tr>
                        <th className={journalDateHeaderClass}>Date</th>
                        <th className={journalVoucherHeaderClass}>Voucher</th>
                        <th className={`${financeThRight} px-1.5 py-1`}>Deposit</th>
                        <th className={`${financeThRight} px-1.5 py-1`}>Withdrawal</th>
                        <th className={journalBalanceHeaderClass}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {journal.lines.map((line) => (
                        <tr
                          key={line.journalLineId}
                          className={journalRowClass(
                            line.journalLineId,
                            matchSummary.matchedJournalLineIds
                          )}
                          title={journalRowTitle(line.journalLineId, matchSummary, journal.lines)}
                          data-testid={`bank-cash-line-${line.journalLineId}`}
                        >
                          <td className={journalDateCellClass}>
                            {formatBankCashCheckDayMonth(line.journalDate)}
                          </td>
                          <td className={journalVoucherCellClass}>
                            <GeneralLedgerRefLink
                              tx={{
                                journalEntryId: line.journalEntryId,
                                entryNo: line.entryNo,
                                sourceRef: line.sourceRef,
                                sourceRefType: line.sourceRefType,
                                sourceRefId: null,
                                voucherId: null,
                              }}
                              returnTo={BANK_CASH_RETURN_TO}
                              className="block truncate whitespace-nowrap"
                            />
                          </td>
                          <td className={journalAmountCellClass}>{formatAmount(line.depositAmount)}</td>
                          <td className={journalAmountCellClass}>{formatAmount(line.withdrawalAmount)}</td>
                          <td className={journalBalanceCellClass}>
                            {formatAmount(line.runningBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <BankStatementQuickPanel
              detail={statementDetail}
              lines={quickLines}
              matchSummary={matchSummary}
              matchedJournalLines={matchedJournalLines}
              returnTo={BANK_CASH_RETURN_TO}
              readOnly={readOnly}
              saving={statementSaving}
              completingCheck={statementCompleting}
              canCompleteCheck={canCompleteCheck}
              error={statementError}
              onLinesChange={setQuickLines}
              onSave={handleSaveStatementClick}
              onCompleteCheck={() => void handleCompleteCheck()}
              onAddLine={handleAddQuickLine}
            />
          </div>

          <p className={`text-xs ${themeTextSecondary}`}>
            <Link href={entityPath("/finance/bank-accounts")} className="underline">
              Bank account master
            </Link>
            {" · "}
            <Link href={entityPath("/finance/bank-statements")} className="underline">
              Statement register
            </Link>
            {" · "}
            <Link href={entityPath("/finance/reconciliation/bank")} className="underline">
              Bank reconciliation worksheet
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  )
}
