"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { BankStatementStatusDot } from "@/components/finance/bank-statements/BankStatementStatusDot"
import type { BankStatementDetail, BankStatementStatus } from "@/lib/finance/bank-statement/bank-statement-types"
import {
  isPersistableBankStatementLine,
  validateBankStatementBalances,
} from "@/lib/finance/bank-statement/bank-statement-validate"
import {
  deleteBankStatement,
  fetchBankStatement,
  FINANCE_BANK_STATEMENTS_PAGE_PATH,
  patchBankStatement,
} from "@/lib/finance-ui/bank-statements"
import {
  financeDiffBalanced,
  financeDiffUnbalanced,
  financeMemo,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  financeThRight,
  voucherInquiryFilterButtonPrimary,
  voucherInquiryFilterInput,
  voucherInquiryFilterSelect,
} from "@/lib/finance-ui/finance-visual-classes"
import { formatAmount, formatFinanceListDate } from "@/lib/finance-ui/format"
import {
  useFinanceEntityPathBuilder,
  useFinanceLegalEntityScope,
} from "@/lib/finance-ui/use-finance-legal-entity-scope"
import { formatEntityShort } from "@/lib/legal-entity/display"
import {
  themeBtnPrimary,
  themeBtnSecondary,
  themeInlineError,
  themeLabel,
  themeTextSecondary,
} from "@/lib/theme/theme-classes"

type EditableLine = {
  key: string
  transactionDate: string
  description: string
  chequeNumber: string
  depositAmount: string
  withdrawalAmount: string
  runningBalance: string
}

type BankStatementEditorPageProps = {
  statementId: string
}

function emptyLine(): EditableLine {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    transactionDate: "",
    description: "",
    chequeNumber: "",
    depositAmount: "",
    withdrawalAmount: "",
    runningBalance: "0.00",
  }
}

function mapDetailToLines(detail: BankStatementDetail): EditableLine[] {
  return detail.lines.map((line) => ({
    key: line.id,
    transactionDate: line.transactionDate,
    description: line.description,
    chequeNumber: line.chequeNumber ?? "",
    depositAmount: line.depositAmount ?? "",
    withdrawalAmount: line.withdrawalAmount ?? "",
    runningBalance: line.runningBalance,
  }))
}

export function BankStatementEditorPage({ statementId }: BankStatementEditorPageProps) {
  const legalEntityCode = useFinanceLegalEntityScope()
  const entityPath = useFinanceEntityPathBuilder()

  const [detail, setDetail] = useState<BankStatementDetail | null>(null)
  const [statementDate, setStatementDate] = useState("")
  const [openingBalance, setOpeningBalance] = useState("0.00")
  const [closingBalance, setClosingBalance] = useState("0.00")
  const [status, setStatus] = useState<BankStatementStatus>("NEW")
  const [lines, setLines] = useState<EditableLine[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const readOnly = status === "READY"

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchBankStatement(legalEntityCode, statementId)
      setDetail(result.item)
      setStatementDate(result.item.statementDate)
      setOpeningBalance(result.item.openingBalance)
      setClosingBalance(result.item.closingBalance)
      setStatus(result.item.status)
      setLines(mapDetailToLines(result.item))
    } catch (err: unknown) {
      setDetail(null)
      setError(err instanceof Error ? err.message : "Failed to load bank statement")
    } finally {
      setLoading(false)
    }
  }, [legalEntityCode, statementId])

  useEffect(() => {
    void load()
  }, [load])

  const validation = useMemo(
    () =>
      validateBankStatementBalances({
        openingBalance,
        closingBalance,
        lines: lines.map((line) => ({
          depositAmount: line.depositAmount || null,
          withdrawalAmount: line.withdrawalAmount || null,
        })),
      }),
    [closingBalance, lines, openingBalance]
  )

  const updateLine = (key: string, patch: Partial<EditableLine>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()])
  }

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((line) => line.key !== key))
  }

  const handleSave = async () => {
    const persistableLines = lines.filter((line) =>
      isPersistableBankStatementLine({
        transactionDate: line.transactionDate,
        description: line.description,
        depositAmount: line.depositAmount || null,
        withdrawalAmount: line.withdrawalAmount || null,
      })
    )

    if (lines.length > 0 && persistableLines.length === 0) {
      setError("Enter a deposit or withdrawal amount on at least one statement line.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const result = await patchBankStatement(legalEntityCode, statementId, {
        statementDate,
        openingBalance,
        closingBalance,
        status: status === "NEW" ? "DRAFT" : status,
        lines: persistableLines.map((line, index) => ({
          lineNo: index + 1,
          transactionDate: line.transactionDate,
          description: line.description,
          chequeNumber: line.chequeNumber || null,
          depositAmount: line.depositAmount || null,
          withdrawalAmount: line.withdrawalAmount || null,
          runningBalance: line.runningBalance,
        })),
      })
      setDetail(result.item)
      setStatementDate(result.item.statementDate)
      setOpeningBalance(result.item.openingBalance)
      setClosingBalance(result.item.closingBalance)
      setStatus(result.item.status)
      setLines(mapDetailToLines(result.item))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save bank statement")
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (nextStatus: BankStatementStatus) => {
    setSaving(true)
    setError(null)
    try {
      const result = await patchBankStatement(legalEntityCode, statementId, {
        status: nextStatus,
      })
      setDetail(result.item)
      setStatus(result.item.status)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Delete this bank statement?")) return
    setSaving(true)
    setError(null)
    try {
      await deleteBankStatement(legalEntityCode, statementId)
      window.location.href = entityPath(FINANCE_BANK_STATEMENTS_PAGE_PATH)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete bank statement")
      setSaving(false)
    }
  }

  if (loading) {
    return <p className={`text-sm ${themeTextSecondary}`}>Loading bank statement…</p>
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <p className={themeInlineError}>{error ?? "Bank statement not found"}</p>
        <Link
          href={entityPath(FINANCE_BANK_STATEMENTS_PAGE_PATH)}
          className={`text-sm ${themeTextSecondary} underline underline-offset-2`}
        >
          ← Bank Statements
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="bank-statement-editor-page">
      <Link
        href={entityPath(FINANCE_BANK_STATEMENTS_PAGE_PATH)}
        className={`text-sm print:hidden ${themeTextSecondary} underline underline-offset-2`}
      >
        ← Bank Statements
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BankStatementStatusDot status={status} />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {detail.statementNo}
            </h1>
          </div>
          <p className={`text-sm ${themeTextSecondary}`}>
            {detail.bankAccount.bankName} • {detail.bankAccount.accountNumber} •{" "}
            {detail.periodKey}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className={themeLabel}>Status</span>
            <select
              className={voucherInquiryFilterSelect}
              value={status}
              onChange={(event) =>
                void handleStatusChange(event.target.value as BankStatementStatus)
              }
              disabled={saving}
              data-testid="bank-statement-status"
            >
              <option value="NEW">New</option>
              <option value="DRAFT">Draft</option>
              <option value="READY">Ready</option>
            </select>
          </label>
          {!readOnly ? (
            <>
              <button
                type="button"
                className={themeBtnPrimary}
                onClick={() => void handleSave()}
                disabled={saving}
                data-testid="bank-statement-save"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className={themeBtnSecondary}
                onClick={() => void handleDelete()}
                disabled={saving}
                data-testid="bank-statement-delete"
              >
                Delete
              </button>
            </>
          ) : null}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className={themeLabel}>Legal Entity</p>
          <p className="mt-1 text-sm">{formatEntityShort(detail.legalEntityCode)}</p>
        </div>
        <div>
          <p className={themeLabel}>Bank Account</p>
          <p className="mt-1 text-sm">
            {detail.bankAccount.bankName} • {detail.bankAccount.accountNumber}
          </p>
          <p className={`text-xs ${themeTextSecondary}`}>{detail.bankAccount.accountName}</p>
        </div>
        <div>
          <p className={themeLabel}>Statement Period</p>
          <p className="mt-1 text-sm">{detail.periodKey}</p>
        </div>

        <label className="flex flex-col gap-1">
          <span className={themeLabel}>Statement Date</span>
          <input
            type="date"
            className={voucherInquiryFilterInput}
            value={statementDate}
            onChange={(event) => setStatementDate(event.target.value)}
            disabled={readOnly}
            data-testid="bank-statement-date"
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
            disabled={readOnly}
            data-testid="bank-statement-opening"
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
            disabled={readOnly}
            data-testid="bank-statement-closing"
          />
        </label>
      </section>

      <section
        className={`rounded border px-3 py-2 text-sm ${
          validation.isValid
            ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20"
            : "border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20"
        }`}
        data-testid="bank-statement-validation"
      >
        <p className={validation.isValid ? financeDiffBalanced : financeDiffUnbalanced}>
          {validation.message}
        </p>
        <p className={`mt-1 tabular-nums ${themeTextSecondary}`}>
          Opening {formatAmount(validation.openingBalance)} + Deposits{" "}
          {formatAmount(validation.totalDeposits)} − Withdrawals{" "}
          {formatAmount(validation.totalWithdrawals)} ={" "}
          {formatAmount(validation.computedClosingBalance)} (declared{" "}
          {formatAmount(validation.declaredClosingBalance)})
        </p>
      </section>

      {error ? (
        <p className={themeInlineError} data-testid="bank-statement-error">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-medium">Statement Lines</h2>
          {!readOnly ? (
            <button
              type="button"
              className={voucherInquiryFilterButtonPrimary}
              onClick={addLine}
              data-testid="bank-statement-add-line"
            >
              Add Line
            </button>
          ) : null}
        </div>

        {lines.length === 0 ? (
          <p className={`text-sm ${themeTextSecondary}`} data-testid="bank-statement-lines-empty">
            No statement lines yet.
          </p>
        ) : (
          <div className={financeTableScroll}>
            <table className={financeTable} data-testid="bank-statement-lines-table">
              <thead>
                <tr>
                  <th className={financeTh}>Date</th>
                  <th className={financeTh}>Description</th>
                  <th className={financeTh}>Cheque No</th>
                  <th className={financeThRight}>Deposit</th>
                  <th className={financeThRight}>Withdrawal</th>
                  <th className={financeThRight}>Running Balance</th>
                  {!readOnly ? <th className={financeTh} aria-label="Actions" /> : null}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.key}>
                    <td className={financeMemo}>
                      {readOnly ? (
                        formatFinanceListDate(line.transactionDate)
                      ) : (
                        <input
                          type="date"
                          className={voucherInquiryFilterInput}
                          value={line.transactionDate}
                          onChange={(event) =>
                            updateLine(line.key, { transactionDate: event.target.value })
                          }
                        />
                      )}
                    </td>
                    <td className={financeMemo}>
                      {readOnly ? (
                        line.description
                      ) : (
                        <input
                          type="text"
                          className={`${voucherInquiryFilterInput} min-w-[12rem]`}
                          value={line.description}
                          onChange={(event) =>
                            updateLine(line.key, { description: event.target.value })
                          }
                        />
                      )}
                    </td>
                    <td className={financeMemo}>
                      {readOnly ? (
                        line.chequeNumber || "—"
                      ) : (
                        <input
                          type="text"
                          className={voucherInquiryFilterInput}
                          value={line.chequeNumber}
                          onChange={(event) =>
                            updateLine(line.key, { chequeNumber: event.target.value })
                          }
                        />
                      )}
                    </td>
                    <td className={financeNumber}>
                      {readOnly ? (
                        formatAmount(line.depositAmount || "0")
                      ) : (
                        <input
                          type="text"
                          inputMode="decimal"
                          className={voucherInquiryFilterInput}
                          value={line.depositAmount}
                          onChange={(event) =>
                            updateLine(line.key, {
                              depositAmount: event.target.value,
                              withdrawalAmount: event.target.value ? "" : line.withdrawalAmount,
                            })
                          }
                        />
                      )}
                    </td>
                    <td className={financeNumber}>
                      {readOnly ? (
                        formatAmount(line.withdrawalAmount || "0")
                      ) : (
                        <input
                          type="text"
                          inputMode="decimal"
                          className={voucherInquiryFilterInput}
                          value={line.withdrawalAmount}
                          onChange={(event) =>
                            updateLine(line.key, {
                              withdrawalAmount: event.target.value,
                              depositAmount: event.target.value ? "" : line.depositAmount,
                            })
                          }
                        />
                      )}
                    </td>
                    <td className={`${financeNumber} ${financeDiffBalanced}`}>
                      {readOnly ? (
                        formatAmount(line.runningBalance)
                      ) : (
                        <input
                          type="text"
                          inputMode="decimal"
                          className={voucherInquiryFilterInput}
                          value={line.runningBalance}
                          onChange={(event) =>
                            updateLine(line.key, { runningBalance: event.target.value })
                          }
                        />
                      )}
                    </td>
                    {!readOnly ? (
                      <td>
                        <button
                          type="button"
                          className={`text-xs ${themeTextSecondary} underline`}
                          onClick={() => removeLine(line.key)}
                        >
                          Remove
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
