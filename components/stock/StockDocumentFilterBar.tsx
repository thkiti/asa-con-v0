"use client"

import type { DocStatus } from "@/lib/stock-ui/types"
import {
  masterToolbarInput,
  masterToolbarLabel,
} from "@/lib/master-ui/table-classes"
import type { FiscalPeriodOption } from "@/lib/stock-ui/fiscal-period-options"
import { formatShopBranchLabel, type ShopBranchOption } from "@/lib/stock-ui/fetch-shop-branches"
import {
  STOCK_DOCUMENT_KIND_FILTER_OPTIONS,
  STOCK_DOCUMENT_LIST_STATUS_FILTER_OPTIONS,
  type StockDocumentKindFilter,
} from "@/lib/stock-ui/stock-document-kind-filter"

export type StockDocumentFilterValues = {
  shopBranchId: string
  docKind: StockDocumentKindFilter
  status: "" | DocStatus
  periodMonth: string
}

type StockDocumentFilterBarProps = {
  values: StockDocumentFilterValues
  periodOptions: readonly FiscalPeriodOption[]
  shopOptions: readonly ShopBranchOption[]
  shopFilterDisabled?: boolean
  onChange: (patch: Partial<StockDocumentFilterValues>) => void
}

const FILTER_GRID =
  "grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)] items-end gap-x-2"

export function StockDocumentFilterBar({
  values,
  periodOptions,
  shopOptions,
  shopFilterDisabled = false,
  onChange,
}: StockDocumentFilterBarProps) {
  return (
    <div
      className={`${FILTER_GRID} border-b border-border pb-3 text-xs`}
      role="search"
      aria-label="Stock document filters"
    >
      <label className="flex min-w-0 flex-col">
        <span className={masterToolbarLabel}>Shop</span>
        <select
          value={values.shopBranchId}
          onChange={(e) => onChange({ shopBranchId: e.target.value })}
          disabled={shopFilterDisabled}
          className={masterToolbarInput}
          aria-label="Shop filter"
        >
          {!shopFilterDisabled ? <option value="">All</option> : null}
          {shopOptions.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {formatShopBranchLabel(branch)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col">
        <span className={masterToolbarLabel}>Type</span>
        <select
          value={values.docKind}
          onChange={(e) =>
            onChange({ docKind: e.target.value as StockDocumentKindFilter })
          }
          className={masterToolbarInput}
          aria-label="Document type filter"
        >
          {STOCK_DOCUMENT_KIND_FILTER_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col">
        <span className={masterToolbarLabel}>Status</span>
        <select
          value={values.status}
          onChange={(e) =>
            onChange({ status: e.target.value as StockDocumentFilterValues["status"] })
          }
          className={masterToolbarInput}
          aria-label="Status filter"
        >
          {STOCK_DOCUMENT_LIST_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col">
        <span className={masterToolbarLabel}>Period</span>
        <select
          value={values.periodMonth}
          onChange={(e) => onChange({ periodMonth: e.target.value })}
          className={masterToolbarInput}
          aria-label="Period filter"
        >
          <option value="">All</option>
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
