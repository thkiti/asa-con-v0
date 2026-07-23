"use client"

import type { DocStatus } from "@/lib/stock-ui/types"
import {
  masterToolbarButton,
  masterToolbarInput,
  masterToolbarLabel,
} from "@/lib/master-ui/table-classes"
import { formatShopBranchLabel, type ShopBranchOption } from "@/lib/stock-ui/fetch-shop-branches"
import {
  getStockDocumentKindFilterOptions,
  STOCK_DOCUMENT_LIST_STATUS_FILTER_OPTIONS,
  type StockDocumentKindFilter,
} from "@/lib/stock-ui/stock-document-kind-filter"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import {
  allowsAllShopsFilter,
  getStockDocumentLocationFilterLabel,
  getStockDocumentLocationMode,
} from "@/lib/stock/document-read/stock-document-entity-policy"
import { PeriodSelector } from "@/components/ui/PeriodSelector"
import { INITIAL_END_PERIOD } from "@/lib/stock/end/end-period"
import { themeBtnPrimary, themeBtnSecondary } from "@/lib/theme/theme-classes"

export type StockDocumentFilterValues = {
  shopBranchId: string
  docKind: StockDocumentKindFilter
  status: "" | DocStatus
  /** periodKey YYYY-MM (field name kept for list API compatibility). */
  periodMonth: string
}

type StockDocumentFilterBarProps = {
  values: StockDocumentFilterValues
  shopOptions: readonly ShopBranchOption[]
  shopFilterDisabled?: boolean
  viewerEntityCode: DocumentEntityCode
  onChange: (patch: Partial<StockDocumentFilterValues>) => void
  onSearch: () => void
  onClear: () => void
  showOpenCreateEnd?: boolean
  openCreateEndBusy?: boolean
  openCreateEndDisabledReason?: string | null
  onOpenCreateEnd?: () => void
  createCntHref?: string | null
  createCntDisabledReason?: string | null
}

const FILTER_GRID =
  "grid w-full grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)_minmax(0,0.85fr)_minmax(0,1.35fr)_auto] items-end gap-x-2 gap-y-2"

export function StockDocumentFilterBar({
  values,
  shopOptions,
  shopFilterDisabled = false,
  viewerEntityCode,
  onChange,
  onSearch,
  onClear,
  showOpenCreateEnd = false,
  openCreateEndBusy = false,
  openCreateEndDisabledReason = null,
  onOpenCreateEnd,
  createCntHref = null,
  createCntDisabledReason = null,
}: StockDocumentFilterBarProps) {
  const locationLabel = getStockDocumentLocationFilterLabel(viewerEntityCode)
  const locationMode = getStockDocumentLocationMode(viewerEntityCode)
  const showAllShops = allowsAllShopsFilter(viewerEntityCode) && !shopFilterDisabled
  const kindOptions = getStockDocumentKindFilterOptions(viewerEntityCode)
  const locationReadOnly =
    locationMode === "ho_location" || shopFilterDisabled
  const endDisabled =
    Boolean(openCreateEndDisabledReason) || !onOpenCreateEnd || openCreateEndBusy
  const showCreateCnt = createCntHref != null || createCntDisabledReason != null
  const endButtonLabel =
    values.periodMonth === INITIAL_END_PERIOD
      ? "Open END / Enter Opening"
      : "Open / Create END"

  return (
    <div
      className={`${FILTER_GRID} border-b border-border pb-3 text-xs`}
      role="search"
      aria-label="Stock document filters"
    >
      <label className="flex min-w-0 flex-col">
        <span className={masterToolbarLabel}>{locationLabel}</span>
        <select
          value={values.shopBranchId}
          onChange={(e) => onChange({ shopBranchId: e.target.value })}
          disabled={locationReadOnly}
          className={masterToolbarInput}
          aria-label={`${locationLabel} filter`}
          data-testid="stock-document-location-filter"
        >
          {showAllShops ? <option value="">All Shops</option> : null}
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
          data-testid="stock-document-type-filter"
        >
          {kindOptions.map((option) => (
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

      <PeriodSelector
        periodKey={values.periodMonth}
        onPeriodChange={(next) => onChange({ periodMonth: next })}
        data-testid="stock-document-period"
      />

      <div className="flex flex-wrap items-end justify-end gap-1">
        <button
          type="button"
          className={masterToolbarButton}
          onClick={onSearch}
          data-testid="stock-document-search"
        >
          Search
        </button>
        <button
          type="button"
          className={masterToolbarButton}
          onClick={onClear}
          data-testid="stock-document-clear"
        >
          Clear
        </button>
        {showCreateCnt ? (
          createCntHref && !createCntDisabledReason ? (
            <a
              href={createCntHref}
              className={themeBtnSecondary}
              data-testid="create-cnt"
            >
              Create CNT
            </a>
          ) : (
            <button
              type="button"
              className={themeBtnSecondary}
              disabled
              data-testid="create-cnt"
              title={createCntDisabledReason ?? undefined}
            >
              Create CNT
            </button>
          )
        ) : null}
        {showOpenCreateEnd ? (
          <button
            type="button"
            className={themeBtnPrimary}
            disabled={endDisabled}
            onClick={onOpenCreateEnd}
            data-testid="open-create-end"
            title={openCreateEndDisabledReason ?? undefined}
          >
            {openCreateEndBusy ? "Opening END…" : endButtonLabel}
          </button>
        ) : null}
      </div>
      {(showOpenCreateEnd && openCreateEndDisabledReason) ||
      (showCreateCnt && createCntDisabledReason) ? (
        <p className="col-span-full text-right text-xs text-muted-foreground">
          {createCntDisabledReason ?? openCreateEndDisabledReason}
        </p>
      ) : null}
    </div>
  )
}
