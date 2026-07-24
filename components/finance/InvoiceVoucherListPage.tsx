"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { DocumentInquiryMoreFilter } from "@/components/finance/DocumentInquiryMoreFilter"
import { InquiryFilterActions } from "@/components/ui/InquiryFilterActions"
import { InvoiceVoucherStatusBadge } from "@/components/finance/InvoiceVoucherStatusBadge"
import { formatAmount, formatFinanceListDate } from "@/lib/finance-ui/format"
import { appendFinanceLegalEntityToPath } from "@/lib/finance-ui/finance-entity-scope"
import { useFinanceLegalEntityScope } from "@/lib/finance-ui/use-finance-legal-entity-scope"
import {
  formatInvoiceVoucherDocumentNo,
  INVOICE_VOUCHER_STATUSES,
} from "@/lib/finance-ui/invoice-voucher-display"
import {
  defaultInvoiceVoucherListUiFilter,
  toInvoiceVoucherListFilter,
  type InvoiceVoucherListUiFilter,
} from "@/lib/finance-ui/invoice-voucher-list-filter"
import {
  deleteDraftInvoiceVoucher,
  fetchInvoiceVouchers,
  type InvoiceVoucherListItem,
} from "@/lib/finance-ui/invoice-vouchers"
import { FINANCE_DOCUMENT_INQUIRY_POSTING_STATE_OPTIONS } from "@/lib/finance/inquiry/finance-document-inquiry-filter-options"
import { useInquiryMoreFilterOpen } from "@/lib/finance-ui/inquiry-more-filter-state"
import {
  financeMemo,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  financeThRight,
  manualJournalEntryListActionPrimary,
  manualJournalEntryListActionRow,
  manualJournalEntryListActionSecondary,
  manualJournalEntryListTdDate,
  manualJournalEntryListTdDescription,
  manualJournalEntryListTdDocNo,
  manualJournalEntryListTdStatus,
  voucherInquiryFilterBar,
  voucherInquiryFilterInput,
  voucherInquiryFilterNo,
  voucherInquiryFilterPostingState,
  voucherInquiryFilterSelect,
  voucherInquiryFilterStatus,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLabel, themeLinkMuted, themeTextSecondary } from "@/lib/theme/theme-classes"

const ALL = ""

export function InvoiceVoucherListPage() {
  const legalEntityCode = useFinanceLegalEntityScope()
  const [draft, setDraft] = useState<InvoiceVoucherListUiFilter>(
    defaultInvoiceVoucherListUiFilter
  )
  const [applied, setApplied] = useState<InvoiceVoucherListUiFilter>(
    defaultInvoiceVoucherListUiFilter
  )
  const [entries, setEntries] = useState<InvoiceVoucherListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const appliedFilterKey = useMemo(() => JSON.stringify(applied), [applied])
  const { isMoreFilterOpen, setIsMoreFilterOpen } =
    useInquiryMoreFilterOpen(appliedFilterKey)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchInvoiceVouchers(
        legalEntityCode,
        toInvoiceVoucherListFilter(applied)
      )
      setEntries(result.entries)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice vouchers")
    } finally {
      setLoading(false)
    }
  }, [applied, legalEntityCode])

  useEffect(() => {
    void load()
  }, [load])

  function handleSearch() {
    setIsMoreFilterOpen(false)
    setApplied({ ...draft })
  }

  function handleClear() {
    setIsMoreFilterOpen(false)
    const cleared = defaultInvoiceVoucherListUiFilter()
    setDraft(cleared)
    setApplied(cleared)
  }

  async function handleDelete(row: InvoiceVoucherListItem) {
    if (row.status !== "DRAFT") return
    if (!window.confirm(`Delete draft ${formatInvoiceVoucherDocumentNo(row.entryNo)}?`)) {
      return
    }
    setDeletingId(row.id)
    setError(null)
    try {
      await deleteDraftInvoiceVoucher(legalEntityCode, row.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4" data-testid="invoice-voucher-list">
      <div className={manualJournalEntryListActionRow} data-testid="invoice-voucher-actions">
        <Link
          href={appendFinanceLegalEntityToPath(
            "/finance/invoice-vouchers/new",
            legalEntityCode
          )}
          className={manualJournalEntryListActionPrimary}
          data-testid="new-invoice-voucher"
        >
          New INV
        </Link>
        <button
          type="button"
          className={manualJournalEntryListActionSecondary}
          data-testid="invoice-voucher-refresh"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      <div className={voucherInquiryFilterBar} data-testid="invoice-voucher-filters">
        <DocumentInquiryMoreFilter
          periodKey={draft.periodKey}
          onPeriodKeyChange={(value) =>
            setDraft((prev) => ({ ...prev, periodKey: value }))
          }
          periodTestId="invoice-voucher-filter-period"
          from={draft.dateFrom}
          to={draft.dateTo}
          onFromChange={(value) =>
            setDraft((prev) => ({ ...prev, dateFrom: value }))
          }
          onToChange={(value) => setDraft((prev) => ({ ...prev, dateTo: value }))}
          testIdPrefix="invoice-voucher"
          isMoreFilterOpen={isMoreFilterOpen}
          setIsMoreFilterOpen={setIsMoreFilterOpen}
          onPeriodKeyEnter={handleSearch}
        />
        <label className={voucherInquiryFilterNo}>
          <span className={themeLabel}>No.</span>
          <input
            className={voucherInquiryFilterInput}
            value={draft.entryNo}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, entryNo: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleSearch()
              }
            }}
            placeholder="INV-…"
            data-testid="invoice-voucher-filter-no"
          />
        </label>
        <label className={voucherInquiryFilterStatus}>
          <span className={themeLabel}>Status</span>
          <select
            className={voucherInquiryFilterSelect}
            value={draft.status}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, status: e.target.value }))
            }
            data-testid="filter-status"
          >
            <option value={ALL}>All</option>
            {INVOICE_VOUCHER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className={voucherInquiryFilterPostingState}>
          <span className={themeLabel}>Post</span>
          <select
            className={voucherInquiryFilterSelect}
            value={draft.postingState}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                postingState: e.target.value as InvoiceVoucherListUiFilter["postingState"],
              }))
            }
            data-testid="invoice-voucher-filter-post"
          >
            {FINANCE_DOCUMENT_INQUIRY_POSTING_STATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <InquiryFilterActions
          onPrimary={handleSearch}
          onClear={handleClear}
          primaryTestId="invoice-voucher-search"
          clearTestId="invoice-voucher-clear"
        />
      </div>

      {loading ? (
        <p className={`text-sm ${themeTextSecondary}`}>Loading invoice vouchers…</p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !error ? (
        <>
          <p className={`text-sm ${themeTextSecondary}`}>
            {total} voucher{total === 1 ? "" : "s"}
          </p>
          <div className={financeTableScroll}>
            <table className={financeTable} data-testid="invoice-voucher-table">
              <thead>
                <tr>
                  <th className={financeTh}>Document no.</th>
                  <th className={financeTh}>Date</th>
                  <th className={financeTh}>Customer</th>
                  <th className={financeThRight}>Amount</th>
                  <th className={financeThRight}>Status</th>
                  <th className={financeTh}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.id}>
                    <td className={manualJournalEntryListTdDocNo}>
                      <Link
                        href={appendFinanceLegalEntityToPath(
                          `/finance/invoice-vouchers/${row.id}`,
                          legalEntityCode
                        )}
                        className={`${themeLinkMuted} font-mono text-xs`}
                        data-testid={`entry-link-${row.id}`}
                      >
                        {formatInvoiceVoucherDocumentNo(row.entryNo)}
                      </Link>
                    </td>
                    <td className={`${financeMemo} ${manualJournalEntryListTdDate}`}>
                      {formatFinanceListDate(row.invoiceDate)}
                    </td>
                    <td className={`${financeMemo} ${manualJournalEntryListTdDescription}`}>
                      {row.customerName}
                    </td>
                    <td className={financeNumber}>{formatAmount(row.totalAmount)}</td>
                    <td className={`${financeMemo} ${manualJournalEntryListTdStatus}`}>
                      <InvoiceVoucherStatusBadge status={row.status} />
                    </td>
                    <td className={financeMemo}>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Link
                          href={appendFinanceLegalEntityToPath(
                          `/finance/invoice-vouchers/${row.id}`,
                          legalEntityCode
                        )}
                          className="underline"
                          data-testid={`action-open-${row.id}`}
                        >
                          Open
                        </Link>
                        {row.status === "DRAFT" ? (
                          <>
                            <Link
                              href={appendFinanceLegalEntityToPath(
                          `/finance/invoice-vouchers/${row.id}`,
                          legalEntityCode
                        )}
                              className="underline"
                              data-testid={`action-edit-${row.id}`}
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              className="text-red-700 underline disabled:opacity-50"
                              disabled={deletingId === row.id}
                              onClick={() => void handleDelete(row)}
                              data-testid={`action-delete-${row.id}`}
                            >
                              {deletingId === row.id ? "Deleting…" : "Delete"}
                            </button>
                          </>
                        ) : null}
                        {row.status === "POSTED" ? (
                          <Link
                            href={appendFinanceLegalEntityToPath(
                          `/finance/invoice-vouchers/${row.id}`,
                          legalEntityCode
                        )}
                            className="underline"
                            data-testid={`action-view-${row.id}`}
                          >
                            View
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  )
}
