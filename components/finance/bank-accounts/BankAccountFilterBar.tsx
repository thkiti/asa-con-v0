"use client"

import {
  masterToolbarInput,
  masterToolbarLabel,
} from "@/lib/master-ui/table-classes"
import { themeSelect } from "@/lib/theme/theme-classes"

export type BankAccountStatusFilter = "all" | "active" | "inactive"

export type BankAccountFilterValues = {
  bankName: string
  accountNumber: string
  statusFilter: BankAccountStatusFilter
}

type BankAccountFilterBarProps = {
  values: BankAccountFilterValues
  onChange: (patch: Partial<BankAccountFilterValues>) => void
}

export function statusFilterToActiveFilter(
  statusFilter: BankAccountStatusFilter
): "active" | "inactive" | "all" {
  if (statusFilter === "inactive") return "inactive"
  if (statusFilter === "all") return "all"
  return "active"
}

export function BankAccountFilterBar({ values, onChange }: BankAccountFilterBarProps) {
  return (
    <div
      className="flex flex-wrap items-end gap-x-2 gap-y-2 border-b border-border pb-3 text-xs sm:flex-nowrap"
      role="search"
      aria-label="Bank account filters"
    >
      <label className="flex min-w-[8rem] flex-1 flex-col">
        <span className={masterToolbarLabel}>Bank name</span>
        <input
          type="search"
          value={values.bankName}
          onChange={(event) => onChange({ bankName: event.target.value })}
          placeholder="Bank name…"
          className={masterToolbarInput}
          aria-label="Bank name"
        />
      </label>

      <label className="flex min-w-[8rem] flex-1 flex-col">
        <span className={masterToolbarLabel}>Account number</span>
        <input
          type="search"
          value={values.accountNumber}
          onChange={(event) => onChange({ accountNumber: event.target.value })}
          placeholder="Account number…"
          className={masterToolbarInput}
          aria-label="Account number"
        />
      </label>

      <label className="flex w-[7rem] shrink-0 flex-col min-w-0">
        <span className={masterToolbarLabel}>Status</span>
        <select
          value={values.statusFilter}
          onChange={(event) =>
            onChange({ statusFilter: event.target.value as BankAccountStatusFilter })
          }
          className={themeSelect}
          aria-label="Active status"
          data-testid="bank-account-status-filter"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
      </label>
    </div>
  )
}
