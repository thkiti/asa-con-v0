"use client"

import type { FinanceFilterValues } from "@/lib/finance-ui/types"

type FinanceFilterBarProps = {
  values: FinanceFilterValues
  onChange: (values: FinanceFilterValues) => void
  onApply: () => void
  loading?: boolean
}

export function FinanceFilterBar({
  values,
  onChange,
  onApply,
  loading = false,
}: FinanceFilterBarProps) {
  return (
    <form
      className="flex flex-wrap items-end gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        onApply()
      }}
    >
      <label className="flex flex-col gap-1 text-sm text-zinc-600">
        Branch ID
        <input
          type="text"
          value={values.branchId ?? ""}
          onChange={(event) =>
            onChange({ ...values, branchId: event.target.value })
          }
          className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
          placeholder="Optional"
        />
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
