import Link from "next/link"
import type { DocStatus, DocType } from "@/lib/stock-ui/types"
import { SHOP_STOCK_DOC_TYPES } from "@/lib/stock-ui/constants"
import { formatDocTypeLabel, formatDocumentDate } from "@/lib/stock-ui/format"
import type { StockDocumentListItemVM } from "@/lib/stock-ui/types"
import { StockDocumentStatusBadge } from "./StockDocumentStatusBadge"

const STATUS_FILTER_OPTIONS: Array<{ value: "" | DocStatus; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "POSTED", label: "Posted" },
  { value: "CANCELLED", label: "Cancelled" },
]

export type StockDocumentListFiltersVM = {
  docType: "" | DocType
  status: "" | DocStatus
  periodMonth: string
}

type StockDocumentListViewProps = {
  items: StockDocumentListItemVM[]
  filters: StockDocumentListFiltersVM
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  onFilterChange: (patch: Partial<StockDocumentListFiltersVM>) => void
  onApplyFilters: () => void
  onLoadMore: () => void
}

export function StockDocumentListView({
  items,
  filters,
  loading,
  loadingMore,
  error,
  hasMore,
  onFilterChange,
  onApplyFilters,
  onLoadMore,
}: StockDocumentListViewProps) {
  return (
    <div className="space-y-6">
      <section className="flex flex-wrap gap-3">
        {SHOP_STOCK_DOC_TYPES.map((type) => (
          <Link
            key={type}
            href={`/shop/stock-documents/new?type=${type}`}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            New {formatDocTypeLabel(type)}
          </Link>
        ))}
      </section>

      <section className="rounded border border-zinc-200 bg-zinc-50 p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Filters</h2>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            Type
            <select
              className="rounded border border-zinc-300 bg-white px-2 py-1"
              value={filters.docType}
              onChange={(e) =>
                onFilterChange({
                  docType: e.target.value as StockDocumentListFiltersVM["docType"],
                })
              }
            >
              <option value="">All types</option>
              {SHOP_STOCK_DOC_TYPES.map((type) => (
                <option key={type} value={type}>
                  {formatDocTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            Status
            <select
              className="rounded border border-zinc-300 bg-white px-2 py-1"
              value={filters.status}
              onChange={(e) =>
                onFilterChange({
                  status: e.target.value as StockDocumentListFiltersVM["status"],
                })
              }
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            Period (YYYY-MM)
            <input
              type="text"
              className="rounded border border-zinc-300 bg-white px-2 py-1"
              placeholder="2026-03"
              value={filters.periodMonth}
              onChange={(e) => onFilterChange({ periodMonth: e.target.value })}
            />
          </label>

          <button
            type="button"
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            disabled={loading}
            onClick={onApplyFilters}
          >
            Apply
          </button>
        </div>
      </section>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section>
        {loading && items.length === 0 ? (
          <p className="text-sm text-zinc-600">Loading documents…</p>
        ) : null}

        {!loading && items.length === 0 ? (
          <p className="text-sm text-zinc-600">No stock documents found.</p>
        ) : null}

        {items.length > 0 ? (
          <div className="overflow-x-auto rounded border border-zinc-200">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Ref</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Lines</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-3 py-2">
                      <Link
                        href={`/shop/stock-documents/${row.id}`}
                        className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                      >
                        {row.refNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{formatDocTypeLabel(row.docType)}</td>
                    <td className="px-3 py-2">{formatDocumentDate(row.date)}</td>
                    <td className="px-3 py-2">
                      <StockDocumentStatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.lineCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {hasMore ? (
          <div className="mt-4">
            <button
              type="button"
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
              disabled={loadingMore}
              onClick={onLoadMore}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
