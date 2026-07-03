"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { FinanceDashboardBackLink } from "@/components/finance/FinanceDashboardBackLink"
import { PeriodReconciliationFilterBar } from "@/components/finance/PeriodReconciliationFilterBar"
import { PeriodReconciliationStatusBadge } from "@/components/finance/PeriodReconciliationStatusBadge"
import type { CashReconciliationRow } from "@/lib/finance/cash-reconciliation"
import type { ReconciliationAccountRef } from "@/lib/finance/period-reconciliation-accounts"
import { formatReconciliationAccountLabel } from "@/lib/finance/reconciliation-account-config"
import {
  fetchCashReconciliationList,
  patchCashReconciliation,
  saveCashReconciliationDraft,
} from "@/lib/finance-ui/cash-reconciliation"
import {
  formatPosSettlementBranchLabel,
  type PosSettlementBranchOption,
} from "@/lib/finance-ui/pos-settlement-branches"
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
  actualCountedCash: string
  note: string
  evidenceNote: string
}

const emptyWorksheetDraft: WorksheetDraft = {
  actualCountedCash: "0.00",
  note: "",
  evidenceNote: "",
}

function mapRowToWorksheetDraft(row: CashReconciliationRow): WorksheetDraft {
  return {
    actualCountedCash: row.actualCountedCash,
    note: row.note ?? "",
    evidenceNote: row.evidenceNote ?? "",
  }
}

export function CashReconciliationPage() {
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
  const [branchOptions, setBranchOptions] = useState<PosSettlementBranchOption[]>([])
  const [accountsKnown, setAccountsKnown] = useState(false)
  const [items, setItems] = useState<CashReconciliationRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [worksheetDraft, setWorksheetDraft] =
    useState<WorksheetDraft>(emptyWorksheetDraft)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const appliedFilterKey = useMemo(() => JSON.stringify(filterApplied), [filterApplied])
  const { isMoreFilterOpen, setIsMoreFilterOpen } =
    useInquiryMoreFilterOpen(appliedFilterKey)

  const selectedBranch = useMemo(
    () => branchOptions.find((branch) => branch.id === filterApplied.branchId) ?? null,
    [branchOptions, filterApplied.branchId]
  )

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

  const canLoad = Boolean(
    filterApplied.branchId.trim() && filterApplied.glAccountId.trim()
  )

  const load = useCallback(async (filter: PeriodReconciliationUiFilter) => {
    const query = toPeriodReconciliationListQuery(filter)
    if (!query.branchId || !query.glAccountId) {
      setItems([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await fetchCashReconciliationList(query)
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
  }, [])

  useEffect(() => {
    const fromUrl = parsePeriodReconciliationUiFilterFromSearchParams(searchParams)
    if (!fromUrl) return

    setFilterDraft(fromUrl)
    setFilterApplied(fromUrl)
    if (fromUrl.branchId.trim() && fromUrl.glAccountId.trim()) {
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
    setError(null)
  }

  function handleAccountsLoaded(accounts: ReconciliationAccountRef[]) {
    setConfiguredAccounts(accounts)
    setAccountsKnown(true)
  }

  async function handleSaveDraft() {
    const query = toPeriodReconciliationListQuery(filterApplied)
    if (!query.branchId) {
      setError("Select a branch for cash reconciliation")
      return
    }
    if (!query.glAccountId) {
      setError("Select a cash account before saving")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        periodKey: query.periodKey,
        branchId: query.branchId,
        glAccountId: query.glAccountId,
        actualCountedCash: worksheetDraft.actualCountedCash,
        note: worksheetDraft.note,
        evidenceNote: worksheetDraft.evidenceNote,
      }

      const result = selected
        ? await patchCashReconciliation(selected.id, payload)
        : await saveCashReconciliationDraft(payload)

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
      await patchCashReconciliation(selected.id, { action })
      await load(filterApplied)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workflow action failed")
    } finally {
      setSaving(false)
    }
  }

  const editable = selected?.status === "DRAFT" || !selected
  const noCashAccountsConfigured = accountsKnown && configuredAccounts.length === 0

  return (
    <div className="space-y-6">
      <FinanceDashboardBackLink />
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Cash Reconciliation</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Branch cash count worksheet for configured cash GL accounts.
        </p>
      </div>

      <PeriodReconciliationFilterBar
        mode="cash"
        draft={filterDraft}
        onDraftChange={setFilterDraft}
        isMoreFilterOpen={isMoreFilterOpen}
        setIsMoreFilterOpen={setIsMoreFilterOpen}
        onApply={() => void handleApply()}
        onClear={handleClear}
        onAccountsLoaded={handleAccountsLoaded}
        onBranchesLoaded={setBranchOptions}
        loading={loading}
      />

      <Link href="/finance/reconciliation/bank" className="text-sm text-zinc-600 underline">
        Bank reconciliation
      </Link>

      {noCashAccountsConfigured ? (
        <p
          className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          data-testid="cash-reconciliation-no-accounts-warning"
        >
          No cash reconciliation accounts are configured in Chart of Accounts. Mark GL
          accounts with the cash reconciliation role before using this page.
        </p>
      ) : null}

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

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
                      {canLoad
                        ? "No cash reconciliation for this scope yet."
                        : "Select branch and cash account, then apply to load worksheets."}
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

          {selectedBranch ? (
            <p className="text-sm text-zinc-600">
              Branch: <strong>{formatPosSettlementBranchLabel(selectedBranch)}</strong>
            </p>
          ) : null}

          {selectedAccount ? (
            <p className="text-sm text-zinc-600">
              Account: <strong>{formatReconciliationAccountLabel(selectedAccount)}</strong>
            </p>
          ) : null}

          {selected ? (
            <p className="text-sm text-zinc-600">
              Expected cash (system): <strong>{selected.expectedCash}</strong>
            </p>
          ) : null}

          <label className="block text-sm">
            <span className={themeLabel}>Actual counted cash</span>
            <input
              className={`${voucherInquiryFilterInput} mt-1 w-full`}
              value={worksheetDraft.actualCountedCash}
              disabled={!editable || saving || !canLoad}
              onChange={(event) =>
                setWorksheetDraft((current) => ({
                  ...current,
                  actualCountedCash: event.target.value,
                }))
              }
            />
          </label>

          <label className="block text-sm">
            <span className={themeLabel}>Notes</span>
            <textarea
              className={`${voucherInquiryFilterSelect} mt-1 min-h-20 w-full`}
              value={worksheetDraft.note}
              disabled={!editable || saving || !canLoad}
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
              disabled={!editable || saving || !canLoad}
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
              disabled={!editable || saving || !canLoad}
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
