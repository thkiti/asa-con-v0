"use client"

import {
  masterToolbarInput,
  masterToolbarLabel,
} from "@/lib/master-ui/table-classes"
import type { ListMode } from "@/lib/master/types"
import { themeSelect } from "@/lib/theme/theme-classes"

const HOOK_GROUP_OPTIONS = ["", "K", "C", "M", "O", "S"] as const

export type ProductReferenceRefFilter = "all" | "active" | "trash"

export type ProductReferenceFilterValues = {
  productCode: string
  productName: string
  hookNo: string
  hookGroup: string
  supplierCode: string
  productGroup: string
  refFilter: ProductReferenceRefFilter
}

type ProductReferenceFilterBarProps = {
  values: ProductReferenceFilterValues
  onChange: (patch: Partial<ProductReferenceFilterValues>) => void
}

export function refFilterToListMode(refFilter: ProductReferenceRefFilter): ListMode {
  return refFilter === "trash" ? "trash" : "active"
}

export function listModeToRefFilter(mode: ListMode): ProductReferenceRefFilter {
  return mode === "trash" ? "trash" : "all"
}

export function ProductReferenceFilterBar({
  values,
  onChange,
}: ProductReferenceFilterBarProps) {
  return (
    <div
      className="flex flex-wrap items-end gap-x-2 gap-y-2 border-b border-border pb-3 text-xs sm:flex-nowrap"
      role="search"
      aria-label="Product and reference stock filters"
    >
      <label className="flex w-[6.5rem] shrink-0 flex-col min-w-0">
        <span className={masterToolbarLabel}>Code</span>
        <input
          type="search"
          value={values.productCode}
          onChange={(e) => onChange({ productCode: e.target.value })}
          placeholder="Starts with…"
          className={masterToolbarInput}
          aria-label="Product code"
        />
      </label>

      <label className="flex min-w-[8rem] flex-1 flex-col">
        <span className={masterToolbarLabel}>Name</span>
        <input
          type="search"
          value={values.productName}
          onChange={(e) => onChange({ productName: e.target.value })}
          placeholder="Name…"
          className={masterToolbarInput}
          aria-label="Product name"
        />
      </label>

      <label className="flex w-[4.5rem] shrink-0 flex-col min-w-0">
        <span className={masterToolbarLabel}>Group</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={3}
          value={values.hookNo}
          onChange={(e) => onChange({ hookNo: e.target.value })}
          placeholder="No."
          className={masterToolbarInput}
          aria-label="Hook number"
        />
      </label>

      <label className="flex w-[4.5rem] shrink-0 flex-col min-w-0">
        <span className={masterToolbarLabel}>Hook</span>
        <select
          value={values.hookGroup}
          onChange={(e) => onChange({ hookGroup: e.target.value })}
          className={themeSelect}
          aria-label="Hook group"
        >
          {HOOK_GROUP_OPTIONS.map((option) => (
            <option key={option || "all"} value={option}>
              {option || "All"}
            </option>
          ))}
        </select>
      </label>

      <label className="flex w-[6rem] shrink-0 flex-col min-w-0">
        <span className={masterToolbarLabel}>Supplier</span>
        <input
          type="search"
          value={values.supplierCode}
          onChange={(e) => onChange({ supplierCode: e.target.value })}
          className={masterToolbarInput}
          aria-label="Supplier code"
        />
      </label>

      <label className="flex w-[6rem] shrink-0 flex-col min-w-0">
        <span className={masterToolbarLabel}>Group</span>
        <input
          type="search"
          value={values.productGroup}
          onChange={(e) => onChange({ productGroup: e.target.value })}
          className={masterToolbarInput}
          aria-label="Product group"
        />
      </label>

      <label className="flex w-[5.5rem] shrink-0 flex-col min-w-0">
        <span className={masterToolbarLabel}>Ref.</span>
        <select
          value={values.refFilter}
          onChange={(e) =>
            onChange({ refFilter: e.target.value as ProductReferenceRefFilter })
          }
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
