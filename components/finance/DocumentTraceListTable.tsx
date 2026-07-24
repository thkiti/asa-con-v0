"use client"

import Link from "next/link"
import type { RefObject } from "react"
import { LoadMoreButton } from "@/components/ui/LoadMoreButton"
import { formatFinanceListDate } from "@/lib/finance-ui/format"
import {
  documentTraceListScroll,
  documentTraceListTableHead,
  financeMemo,
  financeTable,
  financeTh,
} from "@/lib/finance-ui/finance-visual-classes"
import {
  formatDocumentTraceListCountLabel,
  formatDocumentTraceListLimitedHelper,
} from "@/lib/finance/audit/document-trace-list-pagination"
import type { DocumentTraceListRow } from "@/lib/finance/audit/document-trace-list"
import { themeEmptyState, themeLinkMuted, themeTextSecondary } from "@/lib/theme/theme-classes"

type DocumentTraceListTableProps = {
  rows: DocumentTraceListRow[]
  selectedTraceQuery: string | null
  onTrace: (row: DocumentTraceListRow) => void
  loading?: boolean
  loadingMore?: boolean
  totalCount?: number | null
  hasMore?: boolean
  onLoadMore?: () => void
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

export function DocumentTraceListTable({
  rows,
  selectedTraceQuery,
  onTrace,
  loading = false,
  loadingMore = false,
  totalCount = null,
  hasMore = false,
  onLoadMore,
  scrollContainerRef,
}: DocumentTraceListTableProps) {
  if (loading && rows.length === 0) {
    return (
      <p className={`text-sm ${themeTextSecondary}`} data-testid="document-trace-list-loading">
        Loading documents…
      </p>
    )
  }

  if (rows.length === 0) {
    return (
      <p className={themeEmptyState} data-testid="document-trace-list-empty">
        No documents match the current filters.
      </p>
    )
  }

  const countLabel = formatDocumentTraceListCountLabel(rows.length, totalCount)
  const limitedHelper = hasMore ? formatDocumentTraceListLimitedHelper(rows.length) : null

  return (
    <div className="space-y-3" data-testid="document-trace-list">
      <p className={`text-sm ${themeTextSecondary}`} data-testid="document-trace-list-count">
        {countLabel}
      </p>
      <div
        ref={scrollContainerRef}
        className={documentTraceListScroll}
        data-testid="document-trace-list-scroll"
      >
        <table className={financeTable} data-testid="document-trace-list-table">
          <thead className={documentTraceListTableHead}>
            <tr>
              <th className={financeTh}>Document No</th>
              <th className={financeTh}>Date</th>
              <th className={financeTh}>Branch</th>
              <th className={financeTh}>Status</th>
              <th className={financeTh}>Amount</th>
              <th className={financeTh}>Voucher No</th>
              <th className={financeTh}>Trace</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = selectedTraceQuery === row.traceQuery
              return (
                <tr
                  key={`${row.traceQuery}-${row.documentNo}`}
                  data-testid={`document-trace-list-row-${row.traceQuery}`}
                  className={selected ? "bg-zinc-50" : undefined}
                >
                  <td className={financeMemo}>
                    {row.documentHref ? (
                      <Link
                        href={row.documentHref}
                        className={themeLinkMuted}
                        data-testid={`document-trace-document-link-${row.traceQuery}`}
                      >
                        {row.documentNo}
                      </Link>
                    ) : (
                      row.documentNo
                    )}
                  </td>
                  <td>{row.date ? formatFinanceListDate(row.date) : "—"}</td>
                  <td>
                    {row.branchCode
                      ? `${row.branchCode}${row.branchName ? ` • ${row.branchName}` : ""}`
                      : "—"}
                  </td>
                  <td>{row.status || "—"}</td>
                  <td>{row.amount ?? "—"}</td>
                  <td className={financeMemo}>{row.voucherNo ?? "—"}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onTrace(row)}
                      className="text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-600"
                      data-testid={`document-trace-trace-button-${row.traceQuery}`}
                    >
                      Trace
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {limitedHelper ? (
        <p
          className={`text-sm ${themeTextSecondary}`}
          data-testid="document-trace-list-limited-helper"
        >
          {limitedHelper}
        </p>
      ) : null}
      {onLoadMore ? (
        <LoadMoreButton
          hasMore={hasMore}
          onClick={onLoadMore}
          loading={loadingMore}
          loadingLabel="Loading more…"
          label="Load more"
          className="text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-600 disabled:opacity-60"
          data-testid="document-trace-list-load-more"
        />
      ) : null}
    </div>
  )
}
