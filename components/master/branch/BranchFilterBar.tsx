"use client"

import {
  masterToolbarInput,
  masterToolbarLabel,
} from "@/lib/master-ui/table-classes"
import type { ListMode } from "@/lib/master/types"
import { themeSelect } from "@/lib/theme/theme-classes"

const BRANCH_TYPE_OPTIONS = ["", "HO", "SH"] as const

export type BranchRefFilter = "all" | "active" | "trash"

export type BranchFilterValues = {
  code: string
  name: string
  type: string
  refFilter: BranchRefFilter
}

type BranchFilterBarProps = {
  values: BranchFilterValues
  onChange: (patch: Partial<BranchFilterValues>) => void
}

export function refFilterToListMode(refFilter: BranchRefFilter): ListMode {
  return refFilter === "trash" ? "trash" : "active"
}

export function refFilterToActiveOnly(refFilter: BranchRefFilter): boolean {
  return refFilter === "active"
}

export function BranchFilterBar({ values, onChange }: BranchFilterBarProps) {
  return (
    <div
      className="flex flex-wrap items-end gap-x-2 gap-y-2 border-b border-border pb-3 text-xs sm:flex-nowrap"
      role="search"
      aria-label="Branch filters"
    >
      <label className="flex w-[6.5rem] shrink-0 flex-col min-w-0">
        <span className={masterToolbarLabel}>Code</span>
        <input
          type="search"
          value={values.code}
          onChange={(e) => onChange({ code: e.target.value })}
          placeholder="Starts with…"
          className={masterToolbarInput}
          aria-label="Branch code"
        />
      </label>

      <label className="flex min-w-[8rem] flex-1 flex-col">
        <span className={masterToolbarLabel}>Name</span>
        <input
          type="search"
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Name…"
          className={masterToolbarInput}
          aria-label="Branch name"
        />
      </label>

      <label className="flex w-[5.5rem] shrink-0 flex-col min-w-0">
        <span className={masterToolbarLabel}>Type</span>
        <select
          value={values.type}
          onChange={(e) => onChange({ type: e.target.value })}
          className={themeSelect}
          aria-label="Branch type"
        >
          {BRANCH_TYPE_OPTIONS.map((option) => (
            <option key={option || "all"} value={option}>
              {option || "All"}
            </option>
          ))}
        </select>
      </label>

      <label className="flex w-[5.5rem] shrink-0 flex-col min-w-0">
        <span className={masterToolbarLabel}>Ref.</span>
        <select
          value={values.refFilter}
          onChange={(e) => onChange({ refFilter: e.target.value as BranchRefFilter })}
          className={themeSelect}
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
