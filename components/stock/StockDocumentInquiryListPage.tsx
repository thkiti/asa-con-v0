"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { StockDocumentInquiryPdfIndicator } from "@/components/stock/StockDocumentInquiryPdfIndicator"
import { formatFinanceListDate } from "@/lib/finance-ui/format"
import {
  financeMemo,
  financeTable,
  financeTableScroll,
  financeTh,
  voucherInquiryFilterActions,
  voucherInquiryFilterBar,
  voucherInquiryFilterBranch,
  voucherInquiryFilterButtonPrimary,
  voucherInquiryFilterButtonSecondary,
  voucherInquiryFilterDate,
  voucherInquiryFilterDocType,
  voucherInquiryFilterInput,
  voucherInquiryFilterNo,
  voucherInquiryFilterPeriod,
  voucherInquiryFilterPostingState,
  voucherInquiryFilterSelect,
  voucherInquiryFilterStatus,
} from "@/lib/finance-ui/finance-visual-classes"
import {
  fetchPosSettlementBranches,
  formatPosSettlementBranchLabel,
  type PosSettlementBranchOption,
} from "@/lib/finance-ui/pos-settlement-branches"
import {
  STOCK_DOCUMENT_INQUIRY_KIND_OPTIONS,
  STOCK_DOCUMENT_INQUIRY_POSTING_STATE_OPTIONS,
  STOCK_DOCUMENT_INQUIRY_STATUS_OPTIONS,
} from "@/lib/stock/inquiry/stock-document-inquiry-filter-options"
import { formatDocStatusLabel } from "@/lib/stock-ui/format"
import {
  applyStockDocumentInquiryNoToFilter,
  buildStockDocumentInquiryReturnPath,
  buildStockDocumentInquirySearchParams,
  fetchStockDocumentsForInquiry,
  parseStockDocumentInquiryFilterFromSearchParams,
  resolveStockDocumentInquiryNoDisplay,
  type StockDocumentInquiryFilter,
  type StockDocumentInquiryRow,
} from "@/lib/stock-ui/stock-document-inquiry"
import {
  themeEmptyState,
  themeInlineError,
  themeLabel,
  themeLinkMuted,
  themeTextSecondary,
} from "@/lib/theme/theme-classes"

const emptyFilter = (): StockDocumentInquiryFilter => ({
  postingState: "all",
})

type StockDocumentInquiryResultsTableProps = {
  documents: StockDocumentInquiryRow[]
  total: number
  listReturnPath: string
}

export function StockDocumentInquiryResultsTable({
  documents,
  total,
  listReturnPath,
}: StockDocumentInquiryResultsTableProps) {
  return (
    <>
      <p className={`text-sm ${themeTextSecondary}`}>
        {total} document{total === 1 ? "" : "s"}
      </p>
      <div className={financeTableScroll}>
        <table
          className={`${financeTable} stock-document-inquiry-table`}
          data-testid="stock-document-inquiry-table"
        >
          <thead>
            <tr>
              <th className={financeTh}>Doc No.</th>
              <th className={financeTh}>Date</th>
              <th className={financeTh}>Branch</th>
              <th className={financeTh}>Type</th>
              <th className={financeTh}>Status</th>
              <th className={financeTh}>Posted</th>
              <th className={financeTh}>PDF</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={7} className={`py-4 text-center ${themeEmptyState}`}>
                  No documents match the current filters.
                </td>
              </tr>
            ) : (
              documents.map((row) => (
                <tr
                  key={row.id}
                  data-testid={`stock-document-inquiry-row-${row.id}`}
                >
                  <td className={financeMemo}>
                    <Link
                      href={`${row.inquiryPath}?returnTo=${encodeURIComponent(listReturnPath)}`}
                      className={themeLinkMuted}
                      data-testid={`stock-document-inquiry-open-${row.id}`}
                    >
                      {row.documentNo}
                    </Link>
                  </td>
                  <td>{formatFinanceListDate(row.date)}</td>
                  <td>
                    {row.branchCode} • {row.branchName}
                  </td>
                  <td>{row.phaseCode}</td>
                  <td>{formatDocStatusLabel(row.status)}</td>
                  <td>{row.posted ? "Yes" : "No"}</td>
                  <td>
                    <StockDocumentInquiryPdfIndicator row={row} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function StockDocumentInquiryListPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const appliedFilter = useMemo(
    () => parseStockDocumentInquiryFilterFromSearchParams(searchParams),
    [searchParams]
  )

  const [draft, setDraft] = useState<StockDocumentInquiryFilter>(appliedFilter)
  const [inquiryNo, setInquiryNo] = useState(() =>
    resolveStockDocumentInquiryNoDisplay(appliedFilter)
  )
  const [documents, setDocuments] = useState<StockDocumentInquiryRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [branches, setBranches] = useState<PosSettlementBranchOption[]>([])

  const listReturnPath = useMemo(
    () => buildStockDocumentInquiryReturnPath(appliedFilter),
    [appliedFilter]
  )

  useEffect(() => {
    setDraft(appliedFilter)
    setInquiryNo(resolveStockDocumentInquiryNoDisplay(appliedFilter))
  }, [appliedFilter])

  useEffect(() => {
    void fetchPosSettlementBranches()
      .then((result) => setBranches(result.items))
      .catch(() => setBranches([]))
  }, [])

  const load = useCallback(async (filter: StockDocumentInquiryFilter) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchStockDocumentsForInquiry(filter)
      setDocuments(result.documents)
      setTotal(result.total)
    } catch (err) {
      setDocuments([])
      setTotal(0)
      setError(err instanceof Error ? err.message : "Failed to load documents")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(appliedFilter)
  }, [appliedFilter, load])

  const applyFilters = () => {
    const next = applyStockDocumentInquiryNoToFilter(draft, inquiryNo)
    const params = buildStockDocumentInquirySearchParams(next)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const clearFilters = () => {
    setDraft(emptyFilter())
    setInquiryNo("")
    router.replace(pathname)
  }

  return (
    <div className="space-y-4" data-testid="stock-document-inquiry-list-page">
      <div className={voucherInquiryFilterBar} data-testid="stock-document-inquiry-filters">
        <label className={voucherInquiryFilterBranch}>
          <span className={themeLabel}>Branch</span>
          <select
            className={voucherInquiryFilterSelect}
            value={draft.branchId ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, branchId: e.target.value || undefined }))
            }
            data-testid="stock-document-inquiry-filter-branch"
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {formatPosSettlementBranchLabel(branch)}
              </option>
            ))}
          </select>
        </label>
        <label className={voucherInquiryFilterPeriod}>
          <span className={themeLabel}>Period</span>
          <input
            className={voucherInquiryFilterInput}
            value={draft.periodKey ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, periodKey: e.target.value || undefined }))
            }
            placeholder="2026-06"
            data-testid="stock-document-inquiry-filter-period"
          />
        </label>
        <label className={voucherInquiryFilterDate}>
          <span className={themeLabel}>From</span>
          <input
            type="date"
            className={voucherInquiryFilterInput}
            value={draft.from ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, from: e.target.value || undefined }))
            }
            data-testid="stock-document-inquiry-filter-from"
          />
        </label>
        <label className={voucherInquiryFilterDate}>
          <span className={themeLabel}>To</span>
          <input
            type="date"
            className={voucherInquiryFilterInput}
            value={draft.to ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, to: e.target.value || undefined }))
            }
            data-testid="stock-document-inquiry-filter-to"
          />
        </label>
        <label className={voucherInquiryFilterDocType}>
          <span className={themeLabel}>Doc Type</span>
          <select
            className={voucherInquiryFilterSelect}
            value={draft.kind ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                kind: (e.target.value || undefined) as StockDocumentInquiryFilter["kind"],
              }))
            }
            data-testid="stock-document-inquiry-filter-doc-type"
          >
            {STOCK_DOCUMENT_INQUIRY_KIND_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={voucherInquiryFilterNo}>
          <span className={themeLabel}>No</span>
          <input
            className={voucherInquiryFilterInput}
            value={inquiryNo}
            onChange={(e) => setInquiryNo(e.target.value)}
            placeholder="ORD-SH001-…"
            data-testid="stock-document-inquiry-filter-no"
          />
        </label>
        <label className={voucherInquiryFilterStatus}>
          <span className={themeLabel}>Status</span>
          <select
            className={voucherInquiryFilterSelect}
            value={draft.status ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                status: (e.target.value || undefined) as StockDocumentInquiryFilter["status"],
              }))
            }
            data-testid="stock-document-inquiry-filter-status"
          >
            {STOCK_DOCUMENT_INQUIRY_STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={voucherInquiryFilterPostingState}>
          <span className={themeLabel}>Posted</span>
          <select
            className={voucherInquiryFilterSelect}
            value={draft.postingState ?? "all"}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                postingState:
                  e.target.value === "all"
                    ? "all"
                    : (e.target.value as "posted" | "unposted"),
              }))
            }
            data-testid="stock-document-inquiry-filter-posting-state"
          >
            {STOCK_DOCUMENT_INQUIRY_POSTING_STATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className={voucherInquiryFilterActions}>
          <button
            type="button"
            className={voucherInquiryFilterButtonPrimary}
            onClick={applyFilters}
            data-testid="stock-document-inquiry-search"
          >
            Search
          </button>
          <button
            type="button"
            className={voucherInquiryFilterButtonSecondary}
            onClick={clearFilters}
            data-testid="stock-document-inquiry-clear"
          >
            Clear
          </button>
        </div>
      </div>

      {loading ? <p className={themeEmptyState}>Loading…</p> : null}
      {error ? <p className={themeInlineError}>{error}</p> : null}

      {!loading && !error ? (
        <StockDocumentInquiryResultsTable
          documents={documents}
          total={total}
          listReturnPath={listReturnPath}
        />
      ) : null}
    </div>
  )
}
