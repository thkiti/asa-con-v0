"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { BankStatementFilterBar } from "@/components/finance/bank-statements/BankStatementFilterBar"
import { BankStatementStatusDot } from "@/components/finance/bank-statements/BankStatementStatusDot"
import type { BankStatementRow } from "@/lib/finance/bank-statement"
import { fetchBankAccounts } from "@/lib/finance-ui/bank-accounts"
import {
  fetchBankStatements,
  formatBankStatementAccountLabel,
  FINANCE_BANK_STATEMENTS_PAGE_PATH,
} from "@/lib/finance-ui/bank-statements"
import {
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  financeThRight,
} from "@/lib/finance-ui/finance-visual-classes"
import { formatAmount } from "@/lib/finance-ui/format"
import {
  useFinanceEntityPathBuilder,
  useFinanceLegalEntityScope,
} from "@/lib/finance-ui/use-finance-legal-entity-scope"
import { useFinancePeriodFilter } from "@/lib/finance-ui/use-finance-period-filter"
import { formatEntityContextTitle } from "@/lib/legal-entity/context-title"
import { themeBtnPrimary, themeInlineError, themeTextSecondary } from "@/lib/theme/theme-classes"
import type { BankStatementFilterValues } from "./BankStatementFilterBar"

export function BankStatementsPage() {
  const legalEntityCode = useFinanceLegalEntityScope()
  const entityPath = useFinanceEntityPathBuilder()
  const router = useRouter()
  const {
    periodKey,
    setPeriodKey,
    periods,
    loading: periodsLoading,
    hasPeriods,
    emptyMessage,
  } = useFinancePeriodFilter()

  const [filterDraft, setFilterDraft] = useState<BankStatementFilterValues>({
    periodKey: "",
    bankAccountId: "",
    statusFilter: "all",
    search: "",
  })
  const [filterApplied, setFilterApplied] = useState(filterDraft)

  const [bankAccounts, setBankAccounts] = useState<
    Awaited<ReturnType<typeof fetchBankAccounts>>["items"]
  >([])
  const [items, setItems] = useState<BankStatementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!periodKey) return
    setFilterDraft((prev) => ({ ...prev, periodKey }))
    setFilterApplied((prev) => ({ ...prev, periodKey }))
  }, [periodKey])

  const pageTitle = formatEntityContextTitle(
    legalEntityCode,
    "Bank Statements",
    periodKey ?? "—"
  )

  useEffect(() => {
    void fetchBankAccounts(legalEntityCode)
      .then((result) => setBankAccounts(result.items))
      .catch(() => setBankAccounts([]))
  }, [legalEntityCode])

  const load = useCallback(async () => {
    if (!filterApplied.periodKey) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await fetchBankStatements(legalEntityCode, {
        periodKey: filterApplied.periodKey,
        bankAccountId: filterApplied.bankAccountId || undefined,
        status: filterApplied.statusFilter,
        search: filterApplied.search || undefined,
      })
      setItems(result.items)
    } catch (err: unknown) {
      setItems([])
      setError(err instanceof Error ? err.message : "Failed to load bank statements")
    } finally {
      setLoading(false)
    }
  }, [filterApplied, legalEntityCode])

  useEffect(() => {
    void load()
  }, [load])

  const applyFilters = () => {
    if (filterDraft.periodKey !== periodKey) {
      setPeriodKey(filterDraft.periodKey)
    }
    setFilterApplied(filterDraft)
  }

  const visibleCount = useMemo(() => items.length, [items])

  return (
    <div className="space-y-6" data-testid="bank-statements-page">
      <Link
        href={entityPath("/finance/accounting-periods")}
        className={`text-sm print:hidden ${themeTextSecondary} underline underline-offset-2`}
      >
        ← Month-End Closing
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1
          className="text-2xl font-bold tracking-tight text-foreground"
          data-testid="entity-context-page-title"
        >
          {pageTitle}
        </h1>
        <button
          type="button"
          className={themeBtnPrimary}
          onClick={() => router.push(entityPath(`${FINANCE_BANK_STATEMENTS_PAGE_PATH}/new`))}
          disabled={!hasPeriods}
          data-testid="bank-statement-new"
        >
          New Statement
        </button>
      </div>

      <p className={`text-sm ${themeTextSecondary}`}>
        Statement register for period close. For day-to-day checking, use{" "}
        <Link href={entityPath("/finance/bank-cash")} className="underline">
          Bank Cash Check
        </Link>{" "}
        to enter paper statement amounts and match against the GL journal.
      </p>

      {!periodsLoading && !hasPeriods ? (
        <p className={`text-sm ${themeTextSecondary}`} data-testid="bank-statements-no-periods">
          {emptyMessage}
        </p>
      ) : (
        <BankStatementFilterBar
          bankAccounts={bankAccounts}
          periods={periods}
          periodsLoading={periodsLoading}
          values={filterDraft}
          onChange={(patch) => setFilterDraft((prev) => ({ ...prev, ...patch }))}
          onApply={applyFilters}
          loading={loading}
        />
      )}

      {error ? (
        <p className={themeInlineError} data-testid="bank-statements-error">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className={`text-sm ${themeTextSecondary}`}>Loading bank statements…</p>
      ) : null}

      {!loading && hasPeriods && visibleCount === 0 ? (
        <p className={`text-sm ${themeTextSecondary}`} data-testid="bank-statements-empty">
          No bank statements match the selected filters.
        </p>
      ) : null}

      {!loading && visibleCount > 0 ? (
        <div className={financeTableScroll}>
          <table className={financeTable} data-testid="bank-statements-table">
            <thead>
              <tr>
                <th className={financeTh} aria-label="Status" />
                <th className={financeTh}>Statement No</th>
                <th className={financeTh}>Bank Account</th>
                <th className={financeTh}>Period</th>
                <th className={financeThRight}>Opening Balance</th>
                <th className={financeThRight}>Closing Balance</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} data-testid={`bank-statement-row-${row.id}`}>
                  <td className="w-8 text-center">
                    <BankStatementStatusDot status={row.status} />
                  </td>
                  <td>
                    <Link
                      href={entityPath(
                        `/finance/bank-cash?bankAccountId=${encodeURIComponent(row.bankAccountId)}&periodKey=${encodeURIComponent(row.periodKey)}`
                      )}
                      className="underline underline-offset-2"
                    >
                      {row.statementNo}
                    </Link>
                  </td>
                  <td>{formatBankStatementAccountLabel(row)}</td>
                  <td>{row.periodKey}</td>
                  <td className={financeNumber}>{formatAmount(row.openingBalance)}</td>
                  <td className={financeNumber}>{formatAmount(row.closingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
