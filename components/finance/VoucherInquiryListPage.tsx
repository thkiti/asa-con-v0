"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { VoucherInquiryPdfIndicator } from "@/components/finance/VoucherInquiryPdfIndicator"
import { DocumentInquiryMoreFilter } from "@/components/finance/DocumentInquiryMoreFilter"
import { formatFinanceListDate } from "@/lib/finance-ui/format"
import {
  financeMemo,
  financeTable,
  financeTableScroll,
  financeTh,
  voucherInquiryActions,
  voucherInquiryFilterActions,
  voucherInquiryFilterBar,
  voucherInquiryFilterBranch,
  voucherInquiryFilterButtonPrimary,
  voucherInquiryFilterButtonSecondary,
  voucherInquiryFilterDocType,
  voucherInquiryFilterInput,
  voucherInquiryFilterNo,
  voucherInquiryFilterPostingState,
  voucherInquiryFilterSelect,
  voucherInquiryFilterStatus,
  voucherInquiryTable,
  voucherInquiryTdActions,
  voucherInquiryTdDate,
  voucherInquiryTdDocNo,
  voucherInquiryTdJournal,
  voucherInquiryTdVoucherNo,
} from "@/lib/finance-ui/finance-visual-classes"
import { appendFinanceReturnTo, buildFinanceJournalInquiryPath } from "@/lib/finance-ui/finance-navigation"
import { VOUCHER_INQUIRY_REF_TYPE_OPTIONS } from "@/lib/finance/inquiry/voucher-document-types"
import {
  FINANCE_DOCUMENT_INQUIRY_POSTING_STATE_OPTIONS,
  FINANCE_DOCUMENT_INQUIRY_STATUS_OPTIONS,
} from "@/lib/finance/inquiry/finance-document-inquiry-filter-options"
import {
  applyVoucherInquiryNoToFilter,
  resolveVoucherInquiryNoDisplay,
} from "@/lib/finance-ui/voucher-inquiry-no-filter"
import {
  INQUIRY_FILTER_DISMISS_ATTR,
  useInquiryMoreFilterOpen,
} from "@/lib/finance-ui/inquiry-more-filter-state"
import {
  buildVoucherInquiryReturnPath,
  buildVoucherInquirySearchParams,
  fetchFinanceDocuments,
  parseVoucherInquiryFilterFromSearchParams,
} from "@/lib/finance-ui/voucher-inquiry"
import {
  fetchPosSettlementBranches,
  formatPosSettlementBranchLabel,
  type PosSettlementBranchOption,
} from "@/lib/finance-ui/pos-settlement-branches"
import type {
  FinanceDocumentInquiryRow,
  FinanceVoucherInquiryFilter,
} from "@/lib/finance-ui/types"
import {
  themeEmptyState,
  themeInlineError,
  themeLabel,
  themeLinkMuted,
  themeTextSecondary,
} from "@/lib/theme/theme-classes"

const emptyFilter = (): FinanceVoucherInquiryFilter => ({
  postingState: "all",
})

type VoucherInquiryResultsTableProps = {
  documents: FinanceDocumentInquiryRow[]
  total: number
  listReturnPath: string
}

export function VoucherInquiryResultsTable({
  documents,
  total,
  listReturnPath,
}: VoucherInquiryResultsTableProps) {
  return (
    <>
      <p className={`text-sm ${themeTextSecondary}`}>
        {total} document{total === 1 ? "" : "s"}
      </p>
      <div className={financeTableScroll}>
        <table
          className={`${financeTable} ${voucherInquiryTable}`}
          data-testid="voucher-inquiry-table"
        >
          <thead>
            <tr>
              <th className={financeTh}>Doc No.</th>
              <th className={financeTh}>Date</th>
              <th className={financeTh}>Voucher No.</th>
              <th className={financeTh}>Journal Entry</th>
              <th className={financeTh}>PDF</th>
              <th className={financeTh}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className={`py-4 text-center ${themeEmptyState}`}>
                  No documents match the current filters.
                </td>
              </tr>
            ) : (
              documents.map((row) => (
                <tr key={`${row.rowKind}-${row.id}`} data-testid={`voucher-inquiry-row-${row.id}`}>
                  <td className={`${financeMemo} ${voucherInquiryTdDocNo}`}>
                    {row.documentNo ?? "—"}
                  </td>
                  <td className={voucherInquiryTdDate}>{formatFinanceListDate(row.date)}</td>
                  <td className={voucherInquiryTdVoucherNo}>{row.voucherNo ?? "—"}</td>
                  <td className={voucherInquiryTdJournal}>
                    {row.journalEntryId ? (
                      <Link
                        href={buildFinanceJournalInquiryPath(row.journalEntryId, listReturnPath)}
                        className={themeLinkMuted}
                        data-testid={`voucher-inquiry-journal-${row.id}`}
                      >
                        {row.journalEntryId.slice(0, 8)}…
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <VoucherInquiryPdfIndicator row={row} />
                  </td>
                  <td className={voucherInquiryTdActions}>
                    <div className={voucherInquiryActions}>
                      <Link
                        href={appendFinanceReturnTo(row.inquiryPath, listReturnPath)}
                        className={themeLinkMuted}
                        data-testid={`voucher-inquiry-view-${row.id}`}
                      >
                        Inquiry
                      </Link>
                      {row.printPath ? (
                        <Link
                          href={appendFinanceReturnTo(row.printPath, listReturnPath)}
                          className={themeLinkMuted}
                          data-testid={`voucher-inquiry-print-${row.id}`}
                        >
                          Print
                        </Link>
                      ) : null}
                    </div>
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

export function VoucherInquiryListPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const appliedFilter = useMemo(
    () => parseVoucherInquiryFilterFromSearchParams(searchParams),
    [searchParams]
  )

  const [draft, setDraft] = useState<FinanceVoucherInquiryFilter>(appliedFilter)
  const [inquiryNo, setInquiryNo] = useState(() => resolveVoucherInquiryNoDisplay(appliedFilter))
  const [documents, setDocuments] = useState<FinanceDocumentInquiryRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [branches, setBranches] = useState<PosSettlementBranchOption[]>([])

  const listReturnPath = useMemo(
    () => buildVoucherInquiryReturnPath(appliedFilter),
    [appliedFilter]
  )

  const appliedFilterQuery = useMemo(
    () => buildVoucherInquirySearchParams(appliedFilter).toString(),
    [appliedFilter]
  )

  const { isMoreFilterOpen, setIsMoreFilterOpen } = useInquiryMoreFilterOpen(appliedFilterQuery)

  useEffect(() => {
    setDraft(appliedFilter)
    setInquiryNo(resolveVoucherInquiryNoDisplay(appliedFilter))
  }, [appliedFilter])

  useEffect(() => {
    void fetchPosSettlementBranches()
      .then((result) => setBranches(result.items))
      .catch(() => setBranches([]))
  }, [])

  const load = useCallback(async (filter: FinanceVoucherInquiryFilter) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFinanceDocuments(filter)
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
    setIsMoreFilterOpen(false)
    const next = applyVoucherInquiryNoToFilter(draft, inquiryNo)
    const params = buildVoucherInquirySearchParams(next)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const clearFilters = () => {
    setIsMoreFilterOpen(false)
    setDraft(emptyFilter())
    setInquiryNo("")
    router.replace(pathname)
  }

  return (
    <div className="space-y-4" data-testid="voucher-inquiry-list-page">
      <div className={voucherInquiryFilterBar} data-testid="voucher-inquiry-filters">
        <label className={voucherInquiryFilterBranch}>
          <span className={themeLabel}>Branch</span>
          <select
            className={voucherInquiryFilterSelect}
            value={draft.branchId ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, branchId: e.target.value || undefined }))
            }
            data-testid="voucher-inquiry-filter-branch"
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {formatPosSettlementBranchLabel(branch)}
              </option>
            ))}
          </select>
        </label>
        <DocumentInquiryMoreFilter
          periodKey={draft.periodKey ?? ""}
          onPeriodKeyChange={(value) =>
            setDraft((prev) => ({ ...prev, periodKey: value || undefined }))
          }
          periodTestId="voucher-inquiry-filter-period"
          from={draft.from ?? ""}
          to={draft.to ?? ""}
          onFromChange={(value) =>
            setDraft((prev) => ({ ...prev, from: value || undefined }))
          }
          onToChange={(value) =>
            setDraft((prev) => ({ ...prev, to: value || undefined }))
          }
          testIdPrefix="voucher-inquiry"
          isMoreFilterOpen={isMoreFilterOpen}
          setIsMoreFilterOpen={setIsMoreFilterOpen}
        />
        <label className={voucherInquiryFilterDocType}>
          <span className={themeLabel}>Doc Type</span>
          <select
            className={voucherInquiryFilterSelect}
            value={draft.refType ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, refType: e.target.value || undefined }))
            }
            data-testid="voucher-inquiry-filter-document-type"
          >
            {VOUCHER_INQUIRY_REF_TYPE_OPTIONS.map((option) => (
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
            placeholder="MJV-… or V-…"
            data-testid="voucher-inquiry-filter-no"
          />
        </label>
        <label className={voucherInquiryFilterStatus}>
          <span className={themeLabel}>Status</span>
          <select
            className={voucherInquiryFilterSelect}
            value={draft.status ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, status: e.target.value || undefined }))
            }
            data-testid="voucher-inquiry-filter-status"
          >
            {FINANCE_DOCUMENT_INQUIRY_STATUS_OPTIONS.map((option) => (
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
            data-testid="voucher-inquiry-filter-posting-state"
          >
            {FINANCE_DOCUMENT_INQUIRY_POSTING_STATE_OPTIONS.map((option) => (
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
            {...{ [INQUIRY_FILTER_DISMISS_ATTR]: "true" }}
            data-testid="voucher-inquiry-search"
          >
            Search
          </button>
          <button
            type="button"
            className={voucherInquiryFilterButtonSecondary}
            onClick={clearFilters}
            {...{ [INQUIRY_FILTER_DISMISS_ATTR]: "true" }}
            data-testid="voucher-inquiry-clear"
          >
            Clear
          </button>
        </div>
      </div>

      {loading ? <p className={themeEmptyState}>Loading…</p> : null}
      {error ? <p className={themeInlineError}>{error}</p> : null}

      {!loading && !error ? (
        <VoucherInquiryResultsTable
          documents={documents}
          total={total}
          listReturnPath={listReturnPath}
        />
      ) : null}
    </div>
  )
}
