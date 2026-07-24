"use client"

import { useEffect, useState, type Dispatch, type SetStateAction } from "react"
import { DocumentInquiryMoreFilter } from "@/components/finance/DocumentInquiryMoreFilter"
import { BranchSelect } from "@/components/ui/BranchSelect"
import { InquiryFilterActions } from "@/components/ui/InquiryFilterActions"
import type { ReconciliationAccountRef } from "@/lib/finance/period-reconciliation-accounts"
import { fetchReconciliationAccounts } from "@/lib/finance-ui/period-reconciliation-accounts"
import {
  fetchPosSettlementBranches,
  formatPosSettlementBranchLabel,
  type PosSettlementBranchOption,
} from "@/lib/finance-ui/pos-settlement-branches"
import { formatReconciliationAccountLabel } from "@/lib/finance/reconciliation-account-config"
import {
  isPeriodReconciliationMoreFilterActive,
  type PeriodReconciliationUiFilter,
} from "@/lib/finance-ui/period-reconciliation-list-filter"
import {
  voucherInquiryFilterBar,
  voucherInquiryFilterBranchWide,
  voucherInquiryFilterGlAccount,
  voucherInquiryFilterSelect,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeInlineError, themeLabel } from "@/lib/theme/theme-classes"

type PeriodReconciliationFilterBarProps = {
  mode: "bank" | "cash"
  draft: PeriodReconciliationUiFilter
  onDraftChange: Dispatch<SetStateAction<PeriodReconciliationUiFilter>>
  isMoreFilterOpen: boolean
  setIsMoreFilterOpen: Dispatch<SetStateAction<boolean>>
  onApply: () => void
  onClear: () => void
  onAccountsLoaded?: (accounts: ReconciliationAccountRef[]) => void
  onBranchesLoaded?: (branches: PosSettlementBranchOption[]) => void
  loading?: boolean
}

export function PeriodReconciliationFilterBar({
  mode,
  draft,
  onDraftChange,
  isMoreFilterOpen,
  setIsMoreFilterOpen,
  onApply,
  onClear,
  onAccountsLoaded,
  onBranchesLoaded,
  loading = false,
}: PeriodReconciliationFilterBarProps) {
  const [branches, setBranches] = useState<PosSettlementBranchOption[]>([])
  const [branchesLoading, setBranchesLoading] = useState(mode === "cash")
  const [branchesError, setBranchesError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<ReconciliationAccountRef[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)

  const accountRole = mode === "bank" ? "BANK" : "CASH"
  const testIdPrefix = mode === "bank" ? "bank-reconciliation" : "cash-reconciliation"
  const accountLabel = mode === "bank" ? "Bank account" : "Cash account"
  const moreFilterActive = isPeriodReconciliationMoreFilterActive(draft)

  useEffect(() => {
    if (mode !== "cash") return

    let cancelled = false
    setBranchesLoading(true)
    void fetchPosSettlementBranches()
      .then((result) => {
        if (cancelled) return
        setBranches(result.items)
        setBranchesError(null)
        onBranchesLoaded?.(result.items)
        if (result.items.length === 1) {
          onDraftChange((current) =>
            current.branchId ? current : { ...current, branchId: result.items[0].id }
          )
        }
      })
      .catch((err) => {
        if (cancelled) return
        setBranches([])
        setBranchesError(err instanceof Error ? err.message : "Failed to load branches")
      })
      .finally(() => {
        if (!cancelled) setBranchesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [mode])

  useEffect(() => {
    let cancelled = false
    setAccountsLoading(true)
    void fetchReconciliationAccounts(accountRole)
      .then((result) => {
        if (cancelled) return
        setAccounts(result.items)
        setAccountsError(null)
        onAccountsLoaded?.(result.items)
        if (result.items.length === 1) {
          onDraftChange((current) =>
            current.glAccountId ? current : { ...current, glAccountId: result.items[0].id }
          )
        }
      })
      .catch((err) => {
        if (cancelled) return
        setAccounts([])
        setAccountsError(
          err instanceof Error ? err.message : "Failed to load reconciliation accounts"
        )
      })
      .finally(() => {
        if (!cancelled) setAccountsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [accountRole])

  const canApply =
    Boolean(draft.glAccountId.trim()) &&
    (mode === "bank" || Boolean(draft.branchId.trim()))

  const branchEmptyLabel = branchesLoading
    ? "Loading branches…"
    : branches.length === 0
      ? "No branches available"
      : "Select branch"

  return (
    <div className={voucherInquiryFilterBar} data-testid={`${testIdPrefix}-filters`}>
      {mode === "cash" ? (
        <BranchSelect
          label="Branch"
          labelClassName={themeLabel}
          wrapperClassName={voucherInquiryFilterBranchWide}
          selectClassName={voucherInquiryFilterSelect}
          value={draft.branchId}
          onChange={(branchId) =>
            onDraftChange((current) => ({ ...current, branchId }))
          }
          options={branches}
          emptyOption={{ label: branchEmptyLabel }}
          formatOptionLabel={formatPosSettlementBranchLabel}
          loading={branchesLoading}
          disabled={branches.length === 0 || loading}
          hint={
            branchesError ? (
              <span className={`text-xs ${themeInlineError}`}>{branchesError}</span>
            ) : null
          }
          data-testid={`${testIdPrefix}-branch-select`}
        />
      ) : null}

      <label className={voucherInquiryFilterGlAccount}>
        <span className={themeLabel}>{accountLabel}</span>
        <select
          className={voucherInquiryFilterSelect}
          value={draft.glAccountId}
          disabled={accountsLoading || accounts.length === 0 || loading}
          onChange={(event) =>
            onDraftChange((current) => ({ ...current, glAccountId: event.target.value }))
          }
          data-testid={`${testIdPrefix}-account-select`}
        >
          <option value="">
            {accountsLoading
              ? "Loading accounts…"
              : accounts.length === 0
                ? `No ${mode} accounts configured`
                : `Select ${mode} account`}
          </option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {formatReconciliationAccountLabel(account)}
            </option>
          ))}
        </select>
        {accountsError ? (
          <span className={`text-xs ${themeInlineError}`}>{accountsError}</span>
        ) : null}
      </label>

      <DocumentInquiryMoreFilter
        periodKey={draft.periodKey}
        onPeriodKeyChange={(value) =>
          onDraftChange((current) => ({ ...current, periodKey: value }))
        }
        periodTestId={`${testIdPrefix}-filter-period`}
        from={draft.dateFrom}
        to={draft.dateTo}
        onFromChange={(value) =>
          onDraftChange((current) => ({ ...current, dateFrom: value }))
        }
        onToChange={(value) =>
          onDraftChange((current) => ({ ...current, dateTo: value }))
        }
        testIdPrefix={testIdPrefix}
        isMoreFilterOpen={isMoreFilterOpen}
        setIsMoreFilterOpen={setIsMoreFilterOpen}
        onPeriodKeyEnter={onApply}
        isMoreFilterActive={moreFilterActive}
      />

      <InquiryFilterActions
        mode="apply-clear"
        onPrimary={onApply}
        onClear={onClear}
        loading={loading}
        loadingPrimaryLabel="…"
        primaryDisabled={!canApply}
        dismissOnAction
        primaryTestId={`${testIdPrefix}-apply`}
        clearTestId={`${testIdPrefix}-clear`}
      />
    </div>
  )
}
