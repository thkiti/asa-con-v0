"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { BankCashCheckReconciliationEvidencePanel } from "@/components/finance/bank-cash/BankCashCheckReconciliationEvidencePanel"
import { FinanceDashboardBackLink } from "@/components/finance/FinanceDashboardBackLink"
import { PeriodReconciliationFilterBar } from "@/components/finance/PeriodReconciliationFilterBar"
import { PeriodReconciliationStatusBadge } from "@/components/finance/PeriodReconciliationStatusBadge"
import type { BankReconciliationRow } from "@/lib/finance/bank-reconciliation"
import type { BankCashCheckReconciliationEvidence } from "@/lib/finance/bank-cash-check"
import type { ReconciliationAccountRef } from "@/lib/finance/period-reconciliation-accounts"
import { formatReconciliationAccountLabel } from "@/lib/finance/reconciliation-account-config"
import {
  fetchBankCashCheckReconciliationEvidence,
} from "@/lib/finance-ui/bank-cash-check-reconciliation-evidence"
import {
  fetchBankReconciliationList,
  patchBankReconciliation,
  saveBankReconciliationDraft,
} from "@/lib/finance-ui/bank-reconciliation"
import {
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  voucherInquiryFilterButtonPrimary,
  voucherInquiryFilterInput,
  voucherInquiryFilterSelect,
} from "@/lib/finance-ui/finance-visual-classes"
import { useInquiryMoreFilterOpen } from "@/lib/finance-ui/inquiry-more-filter-state"
import {
  defaultPeriodReconciliationUiFilter,
  parsePeriodReconciliationUiFilterFromSearchParams,
  toPeriodReconciliationListQuery,
  type PeriodReconciliationUiFilter,
} from "@/lib/finance-ui/period-reconciliation-list-filter"
import { themeLabel } from "@/lib/theme/theme-classes"

type WorksheetDraft = {
  bankStatementBalance: string
  outstandingDeposits: string
  outstandingPayments: string
  bankCharges: string
  interest: string
  adjustments: string
  note: string
  evidenceNote: string
}

const emptyWorksheetDraft: WorksheetDraft = {
  bankStatementBalance: "0.00",
  outstandingDeposits: "0.00",
  outstandingPayments: "0.00",
  bankCharges: "0.00",
  interest: "0.00",
  adjustments: "0.00",
  note: "",
  evidenceNote: "",
}

function mapRowToWorksheetDraft(row: BankReconciliationRow): WorksheetDraft {
  return {
    bankStatementBalance: row.bankStatementBalance,
    outstandingDeposits: row.outstandingDeposits,
    outstandingPayments: row.outstandingPayments,
    bankCharges: row.bankCharges,
    interest: row.interest,
    adjustments: row.adjustments,
    note: row.note ?? "",
    evidenceNote: row.evidenceNote ?? "",
  }
}

export function BankReconciliationPage() {
  const searchParams = useSearchParams()

  const [filterDraft, setFilterDraft] = useState<PeriodReconciliationUiFilter>(() => {
    return (
      parsePeriodReconciliationUiFilterFromSearchParams(searchParams) ??
      defaultPeriodReconciliationUiFilter()
    )
  })
  const [filterApplied, setFilterApplied] =
    useState<PeriodReconciliationUiFilter>(filterDraft)
  const [configuredAccounts, setConfiguredAccounts] = useState<
    ReconciliationAccountRef[]
  >([])
  const [accountsKnown, setAccountsKnown] = useState(false)
  const [items, setItems] = useState<BankReconciliationRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [worksheetDraft, setWorksheetDraft] =
    useState<WorksheetDraft>(emptyWorksheetDraft)
  const [evidence, setEvidence] = useState<BankCashCheckReconciliationEvidence | null>(
    null
  )
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const appliedFilterKey = useMemo(() => JSON.stringify(filterApplied), [filterApplied])
  const { isMoreFilterOpen, setIsMoreFilterOpen } =
    useInquiryMoreFilterOpen(appliedFilterKey)

  const selectedAccount = useMemo(
    () =>
      configuredAccounts.find((account) => account.id === filterApplied.glAccountId) ??
      null,
    [configuredAccounts, filterApplied.glAccountId]
  )

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  )

  const loadEvidence = useCallback(async (filter: PeriodReconciliationUiFilter) => {
    const query = toPeriodReconciliationListQuery(filter)
    if (!query.glAccountId || !query.periodKey) {
      setEvidence(null)
      return
    }

    setEvidenceLoading(true)
    try {
      const result = await fetchBankCashCheckReconciliationEvidence({
        periodKey: query.periodKey,
        glAccountId: query.glAccountId,
      })
      setEvidence(result.evidence)
    } catch {
      setEvidence(null)
    } finally {
      setEvidenceLoading(false)
    }
  }, [])

  const load = useCallback(async (filter: PeriodReconciliationUiFilter) => {
    const query = toPeriodReconciliationListQuery(filter)
    if (!query.glAccountId) {
      setItems([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await fetchBankReconciliationList(query)
      setItems(result.items)
      if (result.items.length > 0) {
        setSelectedId(result.items[0].id)
        setWorksheetDraft(mapRowToWorksheetDraft(result.items[0]))
      } else {
        setSelectedId(null)
        setWorksheetDraft(emptyWorksheetDraft)
      }
    } catch (err) {
      setItems([])
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
    await loadEvidence(filter)
  }, [loadEvidence])

  useEffect(() => {
    const fromUrl = parsePeriodReconciliationUiFilterFromSearchParams(searchParams)
    if (!fromUrl) return

    setFilterDraft(fromUrl)
    setFilterApplied(fromUrl)
    if (fromUrl.glAccountId.trim()) {
      void load(fromUrl)
    }
  }, [searchParams, load])

  useEffect(() => {
    if (selected) {
      setWorksheetDraft(mapRowToWorksheetDraft(selected))
    }
  }, [selected])

  async function handleApply() {
    setIsMoreFilterOpen(false)
    const next = { ...filterDraft }
    setFilterApplied(next)
    await load(next)
  }

  function handleClear() {
    setIsMoreFilterOpen(false)
    const cleared = defaultPeriodReconciliationUiFilter()
    setFilterDraft(cleared)
    setFilterApplied(cleared)
    setItems([])
    setSelectedId(null)
    setWorksheetDraft(emptyWorksheetDraft)
    setEvidence(null)
    setError(null)
  }

  function handleAccountsLoaded(accounts: ReconciliationAccountRef[]) {
    setConfiguredAccounts(accounts)
    setAccountsKnown(true)
  }

  async function handleSaveDraft() {
    const query = toPeriodReconciliationListQuery(filterApplied)
    if (!query.glAccountId) {
      setError("Select a bank account before saving")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        periodKey: query.periodKey,
        glAccountId: query.glAccountId,
        bankStatementBalance: worksheetDraft.bankStatementBalance,
        outstandingDeposits: worksheetDraft.outstandingDeposits,
        outstandingPayments: worksheetDraft.outstandingPayments,
        bankCharges: worksheetDraft.bankCharges,
        interest: worksheetDraft.interest,
        adjustments: worksheetDraft.adjustments,
        note: worksheetDraft.note,
        evidenceNote: worksheetDraft.evidenceNote,
      }

      const result = selected
        ? await patchBankReconciliation(selected.id, payload)
        : await saveBankReconciliationDraft(payload)

      setSelectedId(result.item.id)
      await load(filterApplied)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleWorkflow(action: "SUBMIT" | "CONFIRM" | "LOCK") {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      await patchBankReconciliation(selected.id, { action })
      await load(filterApplied)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workflow action failed")
    } finally {
      setSaving(false)
    }
  }

  const editable = selected?.status === "DRAFT" || !selected
  const noBankAccountsConfigured = accountsKnown && configuredAccounts.length === 0
  const canEditWorksheet = Boolean(filterApplied.glAccountId.trim())

  return (
    <div className="space-y-6">
      <FinanceDashboardBackLink />
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Bank Reconciliation</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Period bank worksheet for configured bank GL accounts. Close Readiness accepts
          confirmed worksheets or a completed Bank Cash Check with zero variance.
        </p>
      </div>

      <PeriodReconciliationFilterBar
        mode="bank"
        draft={filterDraft}
        onDraftChange={setFilterDraft}
        isMoreFilterOpen={isMoreFilterOpen}
        setIsMoreFilterOpen={setIsMoreFilterOpen}
        onApply={() => void handleApply()}
        onClear={handleClear}
        onAccountsLoaded={handleAccountsLoaded}
        loading={loading}
      />

      <Link href="/finance/reconciliation/cash" className="text-sm text-zinc-600 underline">
        Cash reconciliation
      </Link>

      {noBankAccountsConfigured ? (
        <p
          className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          data-testid="bank-reconciliation-no-accounts-warning"
        >
          No bank reconciliation accounts are configured in Chart of Accounts. Mark GL
          accounts with the bank reconciliation role before using this page.
        </p>
      ) : null}

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <BankCashCheckReconciliationEvidencePanel
        evidence={evidence}
        loading={evidenceLoading}
        periodKey={filterApplied.periodKey}
        bankAccountId={evidence?.bankAccountId ?? null}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Worksheets
          </h2>
          <div className={financeTableScroll}>
            <table className={financeTable}>
              <thead>
                <tr>
                  <th className={financeTh}>Account</th>
                  <th className={financeTh}>Status</th>
                  <th className={`${financeTh} ${financeNumber}`}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={item.id === selectedId ? "bg-zinc-50" : undefined}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <td>
                      {item.glAccount.code} • {item.glAccount.name}
                    </td>
                    <td>
                      <PeriodReconciliationStatusBadge status={item.status} />
                    </td>
                    <td className={financeNumber}>{item.variance}</td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-sm text-zinc-500">
                      {selectedAccount
                        ? `No bank reconciliation for ${formatReconciliationAccountLabel(selectedAccount)} yet.`
                        : "Select a bank account and apply to view worksheets."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4 rounded border border-zinc-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Worksheet
            </h2>
            {selected ? (
              <PeriodReconciliationStatusBadge status={selected.status} />
            ) : (
              <span className="text-xs text-zinc-500">New draft</span>
            )}
          </div>

          {selectedAccount ? (
            <p className="text-sm text-zinc-600">
              Account: <strong>{formatReconciliationAccountLabel(selectedAccount)}</strong>
            </p>
          ) : null}

          {selected ? (
            <p className="text-sm text-zinc-600">
              GL balance (system): <strong>{selected.glBalance}</strong> • Reconciled:{" "}
              <strong>{selected.reconciledBalance}</strong>
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["bankStatementBalance", "Bank statement balance"],
                ["outstandingDeposits", "Outstanding deposits"],
                ["outstandingPayments", "Outstanding payments"],
                ["bankCharges", "Bank charges"],
                ["interest", "Interest"],
                ["adjustments", "Adjustments"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className={themeLabel}>{label}</span>
                <input
                  className={`${voucherInquiryFilterInput} mt-1 w-full`}
                  value={worksheetDraft[key]}
                  disabled={!editable || saving || !canEditWorksheet}
                  onChange={(event) =>
                    setWorksheetDraft((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>

          <label className="block text-sm">
            <span className={themeLabel}>Notes</span>
            <textarea
              className={`${voucherInquiryFilterSelect} mt-1 min-h-20 w-full`}
              value={worksheetDraft.note}
              disabled={!editable || saving || !canEditWorksheet}
              onChange={(event) =>
                setWorksheetDraft((current) => ({ ...current, note: event.target.value }))
              }
            />
          </label>

          <label className="block text-sm">
            <span className={themeLabel}>Evidence</span>
            <textarea
              className={`${voucherInquiryFilterSelect} mt-1 min-h-20 w-full`}
              value={worksheetDraft.evidenceNote}
              disabled={!editable || saving || !canEditWorksheet}
              onChange={(event) =>
                setWorksheetDraft((current) => ({
                  ...current,
                  evidenceNote: event.target.value,
                }))
              }
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={voucherInquiryFilterButtonPrimary}
              disabled={!editable || saving || !canEditWorksheet}
              onClick={() => void handleSaveDraft()}
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
            {selected?.status === "DRAFT" ? (
              <button
                type="button"
                className={voucherInquiryFilterButtonPrimary}
                disabled={saving}
                onClick={() => void handleWorkflow("SUBMIT")}
              >
                Submit
              </button>
            ) : null}
            {selected?.status === "SUBMITTED" ? (
              <>
                <button
                  type="button"
                  className={voucherInquiryFilterButtonPrimary}
                  disabled={saving}
                  onClick={() => void handleWorkflow("CONFIRM")}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className={voucherInquiryFilterButtonPrimary}
                  disabled={saving}
                  onClick={() => void handleWorkflow("LOCK")}
                >
                  Lock
                </button>
              </>
            ) : null}
            {selected?.status === "CONFIRMED" ? (
              <button
                type="button"
                className={voucherInquiryFilterButtonPrimary}
                disabled={saving}
                onClick={() => void handleWorkflow("LOCK")}
              >
                Lock
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
