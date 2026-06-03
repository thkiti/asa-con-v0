"use client"

import type { ReactNode } from "react"
import {
  masterToolbar,
  masterToolbarButton,
  masterToolbarButtonActive,
  masterToolbarInput,
  masterToolbarLabel,
} from "@/lib/master-ui/table-classes"

type MasterToolbarProps = {
  searchLabel?: string
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (value: string) => void
  mode: "active" | "trash"
  onModeChange: (mode: "active" | "trash") => void
  extraFilters?: ReactNode
  actions?: ReactNode
}

export function MasterToolbar({
  searchLabel = "Search",
  searchPlaceholder = "Code or name…",
  searchValue,
  onSearchChange,
  mode,
  onModeChange,
  extraFilters,
  actions,
}: MasterToolbarProps) {
  return (
    <div className={masterToolbar}>
      <label className="sm:col-span-2">
        <span className={masterToolbarLabel}>{searchLabel}</span>
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className={masterToolbarInput}
          aria-label={searchLabel}
        />
      </label>
      {extraFilters}
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className={mode === "active" ? masterToolbarButtonActive : masterToolbarButton}
          onClick={() => onModeChange("active")}
        >
          Active
        </button>
        <button
          type="button"
          className={mode === "trash" ? masterToolbarButtonActive : masterToolbarButton}
          onClick={() => onModeChange("trash")}
        >
          Trash
        </button>
      </div>
      <div className="flex flex-wrap items-end justify-end gap-1">{actions}</div>
    </div>
  )
}
