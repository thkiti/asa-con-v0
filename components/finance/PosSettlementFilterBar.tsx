"use client"

import { useEffect, useState } from "react"
import { FinanceSettlementDateInput } from "@/components/finance/FinanceSettlementDateInput"
import {
  fetchPosSettlementBranches,
  formatPosSettlementBranchLabel,
  type PosSettlementBranchOption,
} from "@/lib/finance-ui/pos-settlement-branches"
import {
  financeFilterSelect,
  posSettlementFilterBar,
  posSettlementFilterFieldApply,
  posSettlementFilterFieldBranch,
  posSettlementFilterFieldDate,
} from "@/lib/finance-ui/finance-visual-classes"
import type { FinanceFilterValues } from "@/lib/finance-ui/types"
import { themeBtnPrimary, themeInlineError, themeLabel } from "@/lib/theme/theme-classes"

type PosSettlementFilterBarProps = {
  values: FinanceFilterValues
  onChange: (values: FinanceFilterValues) => void
  onApply: () => void
  loading?: boolean
}

export function PosSettlementFilterBar({
  values,
  onChange,
  onApply,
  loading = false,
}: PosSettlementFilterBarProps) {
  const [branches, setBranches] = useState<PosSettlementBranchOption[]>([])
  const [branchesError, setBranchesError] = useState<string | null>(null)

  useEffect(() => {
    void fetchPosSettlementBranches()
      .then((result) => {
        setBranches(result.items)
        setBranchesError(null)
      })
      .catch((err) => {
        setBranches([])
        setBranchesError(err instanceof Error ? err.message : "Failed to load branches")
      })
  }, [])

  return (
    <form
      className={posSettlementFilterBar}
      onSubmit={(event) => {
        event.preventDefault()
        onApply()
      }}
    >
      <label className={posSettlementFilterFieldBranch}>
        <span className={themeLabel}>Branch</span>
        <select
          data-testid="pos-settlement-branch-select"
          value={values.branchId ?? ""}
          onChange={(event) =>
            onChange({
              ...values,
              branchId: event.target.value || undefined,
            })
          }
          className={`${financeFilterSelect} px-3 py-2`}
        >
          <option value="">All SH branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {formatPosSettlementBranchLabel(branch)}
            </option>
          ))}
        </select>
        {branchesError ? (
          <span className={`text-xs ${themeInlineError}`}>{branchesError}</span>
        ) : null}
      </label>
      <FinanceSettlementDateInput
        label="From"
        value={values.from ?? ""}
        onChange={(from) => onChange({ ...values, from })}
        data-testid="pos-settlement-date-from"
        fieldClassName={posSettlementFilterFieldDate}
        required
      />
      <FinanceSettlementDateInput
        label="To"
        value={values.to ?? ""}
        onChange={(to) => onChange({ ...values, to })}
        data-testid="pos-settlement-date-to"
        fieldClassName={posSettlementFilterFieldDate}
        required
      />
      <div className={posSettlementFilterFieldApply}>
        <span className="invisible text-sm leading-none" aria-hidden>
          Apply
        </span>
        <button
          type="submit"
          disabled={loading}
          className={themeBtnPrimary}
          data-testid="pos-settlement-apply"
        >
          {loading ? "…" : "Apply"}
        </button>
      </div>
    </form>
  )
}
