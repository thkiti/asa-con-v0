import Link from "next/link"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import {
  formatDocumentDate,
  formatStaffFacingDocumentTitle,
  formatStaffFacingDocumentNumber,
} from "@/lib/stock-ui/format"
import type { ShopBranchOption } from "@/lib/stock-ui/fetch-shop-branches"
import type { StockDocumentListItemVM } from "@/lib/stock-ui/types"
import { stockDocumentOperationalHref } from "@/lib/stock-ui/stock-document-href"
import { MasterListStatus } from "@/components/master/shared/MasterListStatus"
import { MasterTable } from "@/components/master/shared/MasterTable"
import { MasterTableRow } from "@/components/master/shared/MasterTableRow"
import { masterPageLayout } from "@/lib/master-ui/table-classes"
import { LoadMoreButton } from "@/components/ui/LoadMoreButton"
import { themeBtnSecondary } from "@/lib/theme/theme-classes"
import { StockDocumentStatusBadge } from "./StockDocumentStatusBadge"
import {
  StockDocumentFilterBar,
  type StockDocumentFilterValues,
} from "./StockDocumentFilterBar"

const COLUMNS = [
  { key: "ref", label: "Ref", width: "180px" },
  { key: "phase", label: "Phase", width: "120px" },
  { key: "date", label: "Date", width: "96px" },
  { key: "status", label: "Status", width: "100px" },
  { key: "lines", label: "Lines", width: "64px" },
] as const

export type StockDocumentListFiltersVM = StockDocumentFilterValues

type StockDocumentListViewProps = {
  items: StockDocumentListItemVM[]
  filters: StockDocumentListFiltersVM
  shopOptions: readonly ShopBranchOption[]
  shopFilterDisabled?: boolean
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  onFilterChange: (patch: Partial<StockDocumentListFiltersVM>) => void
  onSearch: () => void
  onClear: () => void
  onLoadMore: () => void
  viewerEntityCode: DocumentEntityCode
  showOpenCreateEnd?: boolean
  openCreateEndBusy?: boolean
  onOpenCreateEnd?: () => void
  openCreateEndDisabledReason?: string | null
  createCntHref?: string | null
  createCntDisabledReason?: string | null
}

export function StockDocumentListView({
  items,
  filters,
  shopOptions,
  shopFilterDisabled = false,
  loading,
  loadingMore,
  error,
  hasMore,
  onFilterChange,
  onSearch,
  onClear,
  onLoadMore,
  viewerEntityCode,
  showOpenCreateEnd = false,
  openCreateEndBusy = false,
  onOpenCreateEnd,
  openCreateEndDisabledReason = null,
  createCntHref = null,
  createCntDisabledReason = null,
}: StockDocumentListViewProps) {
  const isEmpty = !loading && !error && items.length === 0

  return (
    <div className={`${masterPageLayout} mt-3`}>
      <StockDocumentFilterBar
        values={filters}
        shopOptions={shopOptions}
        shopFilterDisabled={shopFilterDisabled}
        viewerEntityCode={viewerEntityCode}
        onChange={onFilterChange}
        onSearch={onSearch}
        onClear={onClear}
        showOpenCreateEnd={showOpenCreateEnd}
        openCreateEndBusy={openCreateEndBusy}
        openCreateEndDisabledReason={openCreateEndDisabledReason}
        onOpenCreateEnd={onOpenCreateEnd}
        createCntHref={createCntHref}
        createCntDisabledReason={createCntDisabledReason}
      />

      <MasterListStatus loading={loading} error={error} count={items.length} />

      <MasterTable
        columns={COLUMNS}
        isEmpty={isEmpty}
        emptyMessage="No stock documents found."
      >
        {items.map((row) => (
          <MasterTableRow
            key={row.id}
            cells={[
              <Link
                key="ref"
                href={stockDocumentOperationalHref(row.id, row.docType)}
                className="font-medium underline-offset-2 hover:underline"
              >
                {formatStaffFacingDocumentNumber(
                  row.docType,
                  row.status,
                  row.refNo,
                  viewerEntityCode
                )}
              </Link>,
              formatStaffFacingDocumentTitle(row.docType, row.status, viewerEntityCode),
              formatDocumentDate(row.date),
              <StockDocumentStatusBadge key="status" status={row.status} />,
              <span key="lines" className="tabular-nums">
                {row.lineCount}
              </span>,
            ]}
          />
        ))}
      </MasterTable>

      {hasMore ? (
        <div className="mt-3 shrink-0">
          <LoadMoreButton
            hasMore
            onClick={onLoadMore}
            loading={loadingMore}
            loadingLabel="Loading…"
            label="Load more"
            className={themeBtnSecondary}
          />
        </div>
      ) : null}
    </div>
  )
}
