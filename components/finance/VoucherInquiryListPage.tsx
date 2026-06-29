"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { formatAmount, formatFinanceListDate } from "@/lib/finance-ui/format"
import {
  financeFilterSelect,
  financeMemo,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  financeThRight,
  voucherInquiryFilterActions,
  voucherInquiryFilterAmount,
  voucherInquiryFilterBar,
  voucherInquiryFilterBranch,
  voucherInquiryFilterButtonPrimary,
  voucherInquiryFilterButtonSecondary,
  voucherInquiryFilterDate,
  voucherInquiryFilterDocType,
  voucherInquiryFilterDocumentNo,
  voucherInquiryFilterPdfState,
  voucherInquiryFilterPeriod,
  voucherInquiryFilterPostingState,
  voucherInquiryFilterStatus,
  voucherInquiryFilterVoucherNo,
} from "@/lib/finance-ui/finance-visual-classes"
import { appendFinanceReturnTo, buildFinanceJournalInquiryPath } from "@/lib/finance-ui/finance-navigation"
import { VOUCHER_INQUIRY_REF_TYPE_OPTIONS } from "@/lib/finance/inquiry/voucher-document-types"
import {
  FINANCE_DOCUMENT_INQUIRY_PDF_STATE_OPTIONS,
  FINANCE_DOCUMENT_INQUIRY_POSTING_STATE_OPTIONS,
  FINANCE_DOCUMENT_INQUIRY_STATUS_OPTIONS,
} from "@/lib/finance/inquiry/finance-document-inquiry-filter-options"
import { buildManualJournalPdfApiPath } from "@/lib/finance/inquiry/finance-document-inquiry-links"
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
import { formatEntityShort } from "@/lib/legal-entity/display"
import { themeInput, themeLabel, themeLinkMuted } from "@/lib/theme/theme-classes"

const emptyFilter = (): FinanceVoucherInquiryFilter => ({
  postingState: "all",
})

function formatBranchLabel(row: FinanceDocumentInquiryRow): string {
  return `${row.branchCode} • ${row.branchName}`
}

function formatPdfIndicator(pdfAvailable: boolean | null): string {
  if (pdfAvailable === null) return "—"
  return pdfAvailable ? "Yes" : "Missing"
}

type VoucherInquiryResultsTableProps = {
  documents: FinanceDocumentInquiryRow[]
  total: number
  rowOffset: number
  listReturnPath: string
}

export function VoucherInquiryResultsTable({
  documents,
  total,
  rowOffset,
  listReturnPath,
}: VoucherInquiryResultsTableProps) {
  return (
    <>
      <p className="text-sm text-zinc-600">
        {total} document{total === 1 ? "" : "s"}
      </p>
      <div className={financeTableScroll}>
        <table className={financeTable} data-testid="voucher-inquiry-table">
          <thead>
            <tr>
              <th className={financeTh}>No.</th>
              <th className={financeTh}>Entity</th>
              <th className={financeTh}>Type</th>
              <th className={financeTh}>Document No</th>
              <th className={financeTh}>Date</th>
              <th className={financeTh}>Period</th>
              <th className={financeTh}>Branch</th>
              <th className={financeTh}>Status</th>
              <th className={financeThRight}>Amount</th>
              <th className={financeTh}>Voucher No</th>
              <th className={financeTh}>Journal Entry</th>
              <th className={financeTh}>PDF</th>
              <th className={financeTh}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-4 text-center text-sm text-zinc-500">
                  No documents match the current filters.
                </td>
              </tr>
            ) : (
              documents.map((row, index) => (
                <tr key={`${row.rowKind}-${row.id}`} data-testid={`voucher-inquiry-row-${row.id}`}>
                  <td className="text-zinc-600">{rowOffset + index + 1}</td>
                  <td>{formatEntityShort(row.legalEntityCode)}</td>
                  <td>{row.documentTypeCode}</td>
                  <td className={financeMemo}>{row.documentNo ?? "—"}</td>
                  <td>{formatFinanceListDate(row.date)}</td>
                  <td>{row.periodKey ?? "—"}</td>
                  <td className="text-sm">{formatBranchLabel(row)}</td>
                  <td>{row.status}</td>
                  <td className={financeNumber}>{formatAmount(row.amount)}</td>
                  <td className="font-mono text-xs">{row.voucherNo ?? "—"}</td>
                  <td className="font-mono text-xs">
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
                  <td
                    data-testid={`voucher-inquiry-pdf-${row.id}`}
                    className={row.pdfAvailable === false ? "text-amber-700" : undefined}
                  >
                    {formatPdfIndicator(row.pdfAvailable)}
                  </td>
                  <td className="whitespace-nowrap">
                    <Link
                      href={appendFinanceReturnTo(row.inquiryPath, listReturnPath)}
                      className={themeLinkMuted}
                      data-testid={`voucher-inquiry-view-${row.id}`}
                    >
                      Inquiry
                    </Link>
                    {row.printPath ? (
                      <>
                        {" · "}
                        <Link
                          href={appendFinanceReturnTo(row.printPath, listReturnPath)}
                          className={themeLinkMuted}
                          data-testid={`voucher-inquiry-print-${row.id}`}
                        >
                          Print
                        </Link>
                      </>
                    ) : null}
                    {row.pdfAvailable &&
                    row.operationalDocumentId &&
                    (row.documentTypeCode === "MJV" || row.documentTypeCode === "OPB") ? (
                      <>
                        {" · "}
                        <a
                          href={buildManualJournalPdfApiPath(row.operationalDocumentId)}
                          className={themeLinkMuted}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`voucher-inquiry-pdf-link-${row.id}`}
                        >
                          PDF
                        </a>
                      </>
                    ) : null}
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
  const [documents, setDocuments] = useState<FinanceDocumentInquiryRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [branches, setBranches] = useState<PosSettlementBranchOption[]>([])

  const listReturnPath = useMemo(
    () => buildVoucherInquiryReturnPath(appliedFilter),
    [appliedFilter]
  )

  const rowOffset = appliedFilter.offset ?? 0

  useEffect(() => {
    setDraft(appliedFilter)
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
    const params = buildVoucherInquirySearchParams(draft)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const clearFilters = () => {
    setDraft(emptyFilter())
    router.replace(pathname)
  }

  return (
    <div className="space-y-4" data-testid="voucher-inquiry-list-page">
      <div className={voucherInquiryFilterBar} data-testid="voucher-inquiry-filters">
        <label className={voucherInquiryFilterPeriod}>
          <span className={themeLabel}>Period</span>
          <input
            className={themeInput}
            value={draft.periodKey ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, periodKey: e.target.value || undefined }))
            }
            placeholder="2026-06"
            data-testid="voucher-inquiry-filter-period"
          />
        </label>
        <label className={voucherInquiryFilterDate}>
          <span className={themeLabel}>From</span>
          <input
            type="date"
            className={themeInput}
            value={draft.from ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, from: e.target.value || undefined }))
            }
            data-testid="voucher-inquiry-filter-from"
          />
        </label>
        <label className={voucherInquiryFilterDate}>
          <span className={themeLabel}>To</span>
          <input
            type="date"
            className={themeInput}
            value={draft.to ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, to: e.target.value || undefined }))
            }
            data-testid="voucher-inquiry-filter-to"
          />
        </label>
        <label className={voucherInquiryFilterDocType}>
          <span className={themeLabel}>Document Type</span>
          <select
            className={financeFilterSelect}
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
        <label className={voucherInquiryFilterStatus}>
          <span className={themeLabel}>Status</span>
          <select
            className={financeFilterSelect}
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
            className={financeFilterSelect}
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
        <label className={voucherInquiryFilterBranch}>
          <span className={themeLabel}>Branch</span>
          <select
            className={financeFilterSelect}
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
        <label className={voucherInquiryFilterDocumentNo}>
          <span className={themeLabel}>Document No</span>
          <input
            className={themeInput}
            value={draft.documentNo ?? draft.refNo ?? ""}
            onChange={(e) => {
              const value = e.target.value || undefined
              setDraft((prev) => ({ ...prev, documentNo: value, refNo: value }))
            }}
            placeholder="MJV-…"
            data-testid="voucher-inquiry-filter-document-no"
          />
        </label>
        <label className={voucherInquiryFilterVoucherNo}>
          <span className={themeLabel}>Voucher No</span>
          <input
            className={themeInput}
            value={draft.voucherNo ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, voucherNo: e.target.value || undefined }))
            }
            placeholder="0001"
            data-testid="voucher-inquiry-filter-voucher-no"
          />
        </label>
        <label className={voucherInquiryFilterAmount}>
          <span className={themeLabel}>Amount min</span>
          <input
            className={themeInput}
            value={draft.amountMin ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, amountMin: e.target.value || undefined }))
            }
            placeholder="0.00"
            data-testid="voucher-inquiry-filter-amount-min"
          />
        </label>
        <label className={voucherInquiryFilterAmount}>
          <span className={themeLabel}>Amount max</span>
          <input
            className={themeInput}
            value={draft.amountMax ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, amountMax: e.target.value || undefined }))
            }
            placeholder="999999.99"
            data-testid="voucher-inquiry-filter-amount-max"
          />
        </label>
        <label className={voucherInquiryFilterPdfState}>
          <span className={themeLabel}>Archive PDF</span>
          <select
            className={financeFilterSelect}
            value={draft.pdfState ?? ""}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                pdfState:
                  e.target.value === "has" || e.target.value === "missing"
                    ? e.target.value
                    : undefined,
              }))
            }
            data-testid="voucher-inquiry-filter-pdf-state"
          >
            {FINANCE_DOCUMENT_INQUIRY_PDF_STATE_OPTIONS.map((option) => (
              <option key={option.value || "any"} value={option.value}>
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
            data-testid="voucher-inquiry-search"
          >
            Search
          </button>
          <button
            type="button"
            className={voucherInquiryFilterButtonSecondary}
            onClick={clearFilters}
            data-testid="voucher-inquiry-clear"
          >
            Clear
          </button>
        </div>
      </div>

      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !error ? (
        <VoucherInquiryResultsTable
          documents={documents}
          total={total}
          rowOffset={rowOffset}
          listReturnPath={listReturnPath}
        />
      ) : null}
    </div>
  )
}
