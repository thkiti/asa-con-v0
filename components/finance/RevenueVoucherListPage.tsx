"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { DocumentInquiryMoreFilter } from "@/components/finance/DocumentInquiryMoreFilter"
import { FilterSelectField, StatusFilterField } from "@/components/ui/FilterSelectField"
import { InquiryFilterActions } from "@/components/ui/InquiryFilterActions"
import { RevenueVoucherStatusBadge } from "@/components/finance/RevenueVoucherStatusBadge"
import { formatAmount, formatFinanceListDate } from "@/lib/finance-ui/format"
import { appendFinanceLegalEntityToPath } from "@/lib/finance-ui/finance-entity-scope"
import { useFinanceLegalEntityScope } from "@/lib/finance-ui/use-finance-legal-entity-scope"
import {
  formatRevenueVoucherDocumentNo,
  REVENUE_VOUCHER_STATUSES,
} from "@/lib/finance-ui/revenue-voucher-display"
import {
  defaultRevenueVoucherListUiFilter,
  toRevenueVoucherListFilter,
  type RevenueVoucherListUiFilter,
} from "@/lib/finance-ui/revenue-voucher-list-filter"
import {
  deleteDraftRevenueVoucher,
  fetchRevenueVouchers,
  type RevenueVoucherListItem,
} from "@/lib/finance-ui/revenue-vouchers"
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
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLabel, themeLinkMuted, themeTextSecondary } from "@/lib/theme/theme-classes"

export function RevenueVoucherListPage() {
  const legalEntityCode = useFinanceLegalEntityScope()
  const [draft, setDraft] = useState<RevenueVoucherListUiFilter>(
    defaultRevenueVoucherListUiFilter
  )
  const [applied, setApplied] = useState<RevenueVoucherListUiFilter>(
    defaultRevenueVoucherListUiFilter
  )
  const [entries, setEntries] = useState<RevenueVoucherListItem[]>([])
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
      const result = await fetchRevenueVouchers(
        legalEntityCode,
        toRevenueVoucherListFilter(applied)
      )
      setEntries(result.entries)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load revenue vouchers")
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
    const cleared = defaultRevenueVoucherListUiFilter()
    setDraft(cleared)
    setApplied(cleared)
  }

  async function handleDelete(row: RevenueVoucherListItem) {
    if (row.status !== "DRAFT") return
    if (!window.confirm(`Delete draft ${formatRevenueVoucherDocumentNo(row.entryNo)}?`)) {
      return
    }
    setDeletingId(row.id)
    setError(null)
    try {
      await deleteDraftRevenueVoucher(legalEntityCode, row.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4" data-testid="revenue-voucher-list">
      <div className={manualJournalEntryListActionRow} data-testid="revenue-voucher-actions">
        <Link
          href={appendFinanceLegalEntityToPath(
            "/finance/revenue-vouchers/new",
            legalEntityCode
          )}
          className={manualJournalEntryListActionPrimary}
          data-testid="new-revenue-voucher"
        >
          New REV
        </Link>
        <button
          type="button"
          className={manualJournalEntryListActionSecondary}
          data-testid="revenue-voucher-refresh"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      <div className={voucherInquiryFilterBar} data-testid="revenue-voucher-filters">
        <DocumentInquiryMoreFilter
          periodKey={draft.periodKey}
          onPeriodKeyChange={(value) =>
            setDraft((prev) => ({ ...prev, periodKey: value }))
          }
          periodTestId="revenue-voucher-filter-period"
          from={draft.dateFrom}
          to={draft.dateTo}
          onFromChange={(value) =>
            setDraft((prev) => ({ ...prev, dateFrom: value }))
          }
          onToChange={(value) => setDraft((prev) => ({ ...prev, dateTo: value }))}
          testIdPrefix="revenue-voucher"
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
            placeholder="REV-…"
            data-testid="revenue-voucher-filter-no"
          />
        </label>
        <StatusFilterField
          value={draft.status}
          onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))}
          emptyOption={{ label: "All" }}
          options={REVENUE_VOUCHER_STATUSES.map((status) => ({
            value: status,
            label: status,
          }))}
          data-testid="filter-status"
        />
        <FilterSelectField
          label="Post"
          wrapperClassName={voucherInquiryFilterPostingState}
          value={draft.postingState}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              postingState: value as RevenueVoucherListUiFilter["postingState"],
            }))
          }
          options={FINANCE_DOCUMENT_INQUIRY_POSTING_STATE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          data-testid="revenue-voucher-filter-post"
        />
        <InquiryFilterActions
          onPrimary={handleSearch}
          onClear={handleClear}
          primaryTestId="revenue-voucher-search"
          clearTestId="revenue-voucher-clear"
        />
      </div>

      {loading ? (
        <p className={`text-sm ${themeTextSecondary}`}>Loading revenue vouchers…</p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !error ? (
        <>
          <p className={`text-sm ${themeTextSecondary}`}>
            {total} voucher{total === 1 ? "" : "s"}
          </p>
          <div className={financeTableScroll}>
            <table className={financeTable} data-testid="revenue-voucher-table">
              <thead>
                <tr>
                  <th className={financeTh}>Document no.</th>
                  <th className={financeTh}>Date</th>
                  <th className={financeTh}>Received from</th>
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
                          `/finance/revenue-vouchers/${row.id}`,
                          legalEntityCode
                        )}
                        className={`${themeLinkMuted} font-mono text-xs`}
                        data-testid={`entry-link-${row.id}`}
                      >
                        {formatRevenueVoucherDocumentNo(row.entryNo)}
                      </Link>
                    </td>
                    <td className={`${financeMemo} ${manualJournalEntryListTdDate}`}>
                      {formatFinanceListDate(row.entryDate)}
                    </td>
                    <td className={`${financeMemo} ${manualJournalEntryListTdDescription}`}>
                      {row.receivedFromName}
                    </td>
                    <td className={financeNumber}>{formatAmount(row.totalAmount)}</td>
                    <td className={`${financeMemo} ${manualJournalEntryListTdStatus}`}>
                      <RevenueVoucherStatusBadge status={row.status} />
                    </td>
                    <td className={financeMemo}>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Link
                          href={appendFinanceLegalEntityToPath(
                          `/finance/revenue-vouchers/${row.id}`,
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
                          `/finance/revenue-vouchers/${row.id}`,
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
                          `/finance/revenue-vouchers/${row.id}`,
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
