"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AccountingPeriodSelect } from "@/components/finance/AccountingPeriodSelect"
import type { BankAccountRow } from "@/lib/finance/bank-account"
import { fetchBankAccounts } from "@/lib/finance-ui/bank-accounts"
import {
  createBankStatement,
  FINANCE_BANK_STATEMENTS_PAGE_PATH,
} from "@/lib/finance-ui/bank-statements"
import {
  voucherInquiryFilterInput,
  voucherInquiryFilterSelect,
} from "@/lib/finance-ui/finance-visual-classes"
import {
  useFinanceEntityPathBuilder,
  useFinanceLegalEntityScope,
} from "@/lib/finance-ui/use-finance-legal-entity-scope"
import { useFinancePeriodFilter } from "@/lib/finance-ui/use-finance-period-filter"
import { formatEntityShort } from "@/lib/legal-entity/display"
import {
  themeBtnPrimary,
  themeInlineError,
  themeLabel,
  themeTextSecondary,
} from "@/lib/theme/theme-classes"

function defaultStatementDate(periodKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(periodKey.trim())
  if (!match) return ""
  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}`
}

export function BankStatementNewPage() {
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

  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([])
  const [bankAccountId, setBankAccountId] = useState("")
  const [statementDate, setStatementDate] = useState("")
  const [openingBalance, setOpeningBalance] = useState("0.00")
  const [closingBalance, setClosingBalance] = useState("0.00")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchBankAccounts(legalEntityCode)
      .then((result) => {
        setBankAccounts(result.items)
        if (result.items.length === 1) {
          setBankAccountId(result.items[0].id)
        }
      })
      .catch(() => setBankAccounts([]))
  }, [legalEntityCode])

  useEffect(() => {
    if (periodKey) {
      setStatementDate(defaultStatementDate(periodKey))
    }
  }, [periodKey])

  const handleCreate = async () => {
    if (!periodKey) {
      setError(emptyMessage)
      return
    }
    if (!bankAccountId) {
      setError("Select a bank account")
      return
    }
    if (!statementDate) {
      setError("Statement date is required")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await createBankStatement(legalEntityCode, {
        bankAccountId,
        periodKey,
        statementDate,
        openingBalance,
        closingBalance,
        status: "NEW",
        lines: [],
      })
      router.push(entityPath(`${FINANCE_BANK_STATEMENTS_PAGE_PATH}/${result.item.id}`))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create bank statement")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6" data-testid="bank-statement-new-page">
      <Link
        href={entityPath(FINANCE_BANK_STATEMENTS_PAGE_PATH)}
        className={`text-sm print:hidden ${themeTextSecondary} underline underline-offset-2`}
      >
        ← Bank Statements
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-foreground">New Bank Statement</h1>

      <section className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <div>
          <p className={themeLabel}>Legal Entity</p>
          <p className="mt-1 text-sm">{formatEntityShort(legalEntityCode)}</p>
        </div>

        <label className="flex flex-col gap-1">
          <span className={themeLabel}>Bank Account</span>
          <select
            className={voucherInquiryFilterSelect}
            value={bankAccountId}
            onChange={(event) => setBankAccountId(event.target.value)}
            data-testid="bank-statement-new-bank-account"
          >
            <option value="">Select bank account</option>
            {bankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.bankName} • {account.accountNumber} • {account.accountName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={themeLabel}>Statement Period</span>
          <AccountingPeriodSelect
            className="finance-filter-control finance-filter-control--mono"
            periods={periods}
            value={periodKey}
            onChange={setPeriodKey}
            loading={periodsLoading}
            data-testid="bank-statement-new-period"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={themeLabel}>Statement Date</span>
          <input
            type="date"
            className={voucherInquiryFilterInput}
            value={statementDate}
            onChange={(event) => setStatementDate(event.target.value)}
            data-testid="bank-statement-new-date"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={themeLabel}>Opening Balance</span>
          <input
            type="text"
            inputMode="decimal"
            className={voucherInquiryFilterInput}
            value={openingBalance}
            onChange={(event) => setOpeningBalance(event.target.value)}
            data-testid="bank-statement-new-opening"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={themeLabel}>Closing Balance</span>
          <input
            type="text"
            inputMode="decimal"
            className={voucherInquiryFilterInput}
            value={closingBalance}
            onChange={(event) => setClosingBalance(event.target.value)}
            data-testid="bank-statement-new-closing"
          />
        </label>
      </section>

      {error ? (
        <p className={themeInlineError} data-testid="bank-statement-new-error">
          {error}
        </p>
      ) : null}

      {!periodsLoading && !hasPeriods ? (
        <p className={`text-sm ${themeTextSecondary}`} data-testid="bank-statement-new-no-periods">
          {emptyMessage}
        </p>
      ) : null}

      <button
        type="button"
        className={themeBtnPrimary}
        onClick={() => void handleCreate()}
        disabled={loading || !hasPeriods || !periodKey}
        data-testid="bank-statement-new-create"
      >
        {loading ? "Creating…" : "Create Statement"}
      </button>
    </div>
  )
}
