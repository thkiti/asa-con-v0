"use client"

import { useEffect, useState } from "react"
import {
  fetchPosSettlementBranches,
  formatPosSettlementBranchLabel,
  type PosSettlementBranchOption,
} from "@/lib/finance-ui/pos-settlement-branches"
import type { FinanceFilterValues } from "@/lib/finance-ui/types"

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
      className="flex flex-wrap items-end gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        onApply()
      }}
    >
      <label className="flex flex-col gap-1 text-sm text-zinc-600">
        Branch
        <select
          data-testid="pos-settlement-branch-select"
          value={values.branchId ?? ""}
          onChange={(event) =>
            onChange({
              ...values,
              branchId: event.target.value || undefined,
            })
          }
          className="min-w-[14rem] rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
        >
          <option value="">All SH branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {formatPosSettlementBranchLabel(branch)}
            </option>
          ))}
        </select>
        {branchesError ? (
          <span className="text-xs text-red-600">{branchesError}</span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-600">
        From
        <input
          type="date"
          value={values.from ?? ""}
          onChange={(event) =>
            onChange({ ...values, from: event.target.value })
          }
          className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-600">
        To
        <input
          type="date"
          value={values.to ?? ""}
          onChange={(event) =>
            onChange({ ...values, to: event.target.value })
          }
          className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Loading…" : "Apply"}
      </button>
    </form>
  )
}
