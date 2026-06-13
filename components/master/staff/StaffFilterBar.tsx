"use client"

import {
  masterToolbarInput,
  masterToolbarLabel,
} from "@/lib/master-ui/table-classes"
import type { BranchListItem, ListMode } from "@/lib/master/types"

const ROLE_OPTIONS = [
  "",
  "HO_FINANCE",
  "HO_ADMIN",
  "HO_OPERATIONS",
  "SH_STAFF",
] as const

export type StaffRefFilter = "all" | "active" | "trash"

export type StaffFilterValues = {
  staffId: string
  name: string
  role: string
  branchCode: string
  refFilter: StaffRefFilter
}

type StaffFilterBarProps = {
  values: StaffFilterValues
  branchOptions: BranchListItem[]
  onChange: (patch: Partial<StaffFilterValues>) => void
}

export function refFilterToListMode(refFilter: StaffRefFilter): ListMode {
  return refFilter === "trash" ? "trash" : "active"
}

export function formatBranchFilterLabel(branch: Pick<BranchListItem, "code" | "name">): string {
  return `${branch.code} • ${branch.name}`
}

/** 10 + 40 = left half; 18 + 24 + 8 = right half (Staff / Name / Role / Branch / Ref). */
const STAFF_FILTER_GRID =
  "grid w-full grid-cols-[10fr_40fr_18fr_24fr_8fr] items-end gap-x-2"

export function StaffFilterBar({ values, branchOptions, onChange }: StaffFilterBarProps) {
  return (
    <div
      className={`${STAFF_FILTER_GRID} border-b border-border pb-3 text-xs`}
      role="search"
      aria-label="Staff filters"
    >
      <label className="flex min-w-0 flex-col">
        <span className={masterToolbarLabel}>Staff</span>
        <input
          type="search"
          value={values.staffId}
          onChange={(e) => onChange({ staffId: e.target.value })}
          placeholder="ID…"
          className={masterToolbarInput}
          aria-label="Staff ID"
        />
      </label>

      <label className="flex min-w-0 flex-col">
        <span className={masterToolbarLabel}>Name</span>
        <input
          type="search"
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Name…"
          className={masterToolbarInput}
          aria-label="Staff name"
        />
      </label>

      <label className="flex min-w-0 flex-col">
        <span className={masterToolbarLabel}>Role</span>
        <select
          value={values.role}
          onChange={(e) => onChange({ role: e.target.value })}
          className={masterToolbarInput}
          aria-label="Role filter"
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role || "all"} value={role}>
              {role || "All"}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col">
        <span className={masterToolbarLabel}>Branch</span>
        <select
          value={values.branchCode}
          onChange={(e) => onChange({ branchCode: e.target.value })}
          className={masterToolbarInput}
          aria-label="Branch filter"
        >
          <option value="">All</option>
          {branchOptions.map((branch) => (
            <option key={branch.id} value={branch.code}>
              {formatBranchFilterLabel(branch)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col">
        <span className={masterToolbarLabel}>Ref.</span>
        <select
          value={values.refFilter}
          onChange={(e) => onChange({ refFilter: e.target.value as StaffRefFilter })}
          className={masterToolbarInput}
          aria-label="List mode"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="trash">Trash</option>
        </select>
      </label>
    </div>
  )
}
