"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { DocumentInquiryMoreFilter } from "@/components/finance/DocumentInquiryMoreFilter"
import { FilterSelectField, StatusFilterField } from "@/components/ui/FilterSelectField"
import { InquiryFilterActions } from "@/components/ui/InquiryFilterActions"
import { PaymentVoucherStatusBadge } from "@/components/finance/PaymentVoucherStatusBadge"
import { formatAmount, formatFinanceListDate } from "@/lib/finance-ui/format"
import { appendFinanceLegalEntityToPath } from "@/lib/finance-ui/finance-entity-scope"
import { useFinanceLegalEntityScope } from "@/lib/finance-ui/use-finance-legal-entity-scope"
import {
  formatPaymentVoucherDocumentNo,
  PAYMENT_VOUCHER_STATUSES,
} from "@/lib/finance-ui/payment-voucher-display"
import {
  defaultPaymentVoucherListUiFilter,
  toPaymentVoucherListFilter,
  type PaymentVoucherListUiFilter,
} from "@/lib/finance-ui/payment-voucher-list-filter"
import {
  deleteDraftPaymentVoucher,
  fetchPaymentVouchers,
  type PaymentVoucherListItem,
} from "@/lib/finance-ui/payment-vouchers"
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

export function PaymentVoucherListPage() {
  const legalEntityCode = useFinanceLegalEntityScope()
  const [draft, setDraft] = useState<PaymentVoucherListUiFilter>(
    defaultPaymentVoucherListUiFilter
  )
  const [applied, setApplied] = useState<PaymentVoucherListUiFilter>(
    defaultPaymentVoucherListUiFilter
  )
  const [entries, setEntries] = useState<PaymentVoucherListItem[]>([])
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
      const result = await fetchPaymentVouchers(
        legalEntityCode,
        toPaymentVoucherListFilter(applied)
      )
      setEntries(result.entries)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment vouchers")
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
    const cleared = defaultPaymentVoucherListUiFilter()
    setDraft(cleared)
    setApplied(cleared)
  }

  async function handleDelete(row: PaymentVoucherListItem) {
    if (row.status !== "DRAFT") return
    if (!window.confirm(`Delete draft ${formatPaymentVoucherDocumentNo(row.entryNo)}?`)) {
      return
    }
    setDeletingId(row.id)
    setError(null)
    try {
      await deleteDraftPaymentVoucher(legalEntityCode, row.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4" data-testid="payment-voucher-list">
      <div className={manualJournalEntryListActionRow} data-testid="payment-voucher-actions">
        <Link
          href={appendFinanceLegalEntityToPath(
            "/finance/payment-vouchers/new",
            legalEntityCode
          )}
          className={manualJournalEntryListActionPrimary}
          data-testid="new-payment-voucher"
        >
          New PAV
        </Link>
        <button
          type="button"
          className={manualJournalEntryListActionSecondary}
          data-testid="payment-voucher-refresh"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      <div className={voucherInquiryFilterBar} data-testid="payment-voucher-filters">
        <DocumentInquiryMoreFilter
          periodKey={draft.periodKey}
          onPeriodKeyChange={(value) =>
            setDraft((prev) => ({ ...prev, periodKey: value }))
          }
          periodTestId="payment-voucher-filter-period"
          from={draft.dateFrom}
          to={draft.dateTo}
          onFromChange={(value) =>
            setDraft((prev) => ({ ...prev, dateFrom: value }))
          }
          onToChange={(value) => setDraft((prev) => ({ ...prev, dateTo: value }))}
          testIdPrefix="payment-voucher"
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
            placeholder="PAV-…"
            data-testid="payment-voucher-filter-no"
          />
        </label>
        <StatusFilterField
          value={draft.status}
          onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))}
          emptyOption={{ label: "All" }}
          options={PAYMENT_VOUCHER_STATUSES.map((status) => ({
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
              postingState: value as PaymentVoucherListUiFilter["postingState"],
            }))
          }
          options={FINANCE_DOCUMENT_INQUIRY_POSTING_STATE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          data-testid="payment-voucher-filter-post"
        />
        <InquiryFilterActions
          onPrimary={handleSearch}
          onClear={handleClear}
          primaryTestId="payment-voucher-search"
          clearTestId="payment-voucher-clear"
        />
      </div>

      {loading ? (
        <p className={`text-sm ${themeTextSecondary}`}>Loading payment vouchers…</p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !error ? (
        <>
          <p className={`text-sm ${themeTextSecondary}`}>
            {total} voucher{total === 1 ? "" : "s"}
          </p>
          <div className={financeTableScroll}>
            <table className={financeTable} data-testid="payment-voucher-table">
              <thead>
                <tr>
                  <th className={financeTh}>Document no.</th>
                  <th className={financeTh}>Date</th>
                  <th className={financeTh}>Payee</th>
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
                          `/finance/payment-vouchers/${row.id}`,
                          legalEntityCode
                        )}
                        className={`${themeLinkMuted} font-mono text-xs`}
                        data-testid={`entry-link-${row.id}`}
                      >
                        {formatPaymentVoucherDocumentNo(row.entryNo)}
                      </Link>
                    </td>
                    <td className={`${financeMemo} ${manualJournalEntryListTdDate}`}>
                      {formatFinanceListDate(row.entryDate)}
                    </td>
                    <td className={`${financeMemo} ${manualJournalEntryListTdDescription}`}>
                      {row.payeeName}
                    </td>
                    <td className={financeNumber}>{formatAmount(row.totalAmount)}</td>
                    <td className={`${financeMemo} ${manualJournalEntryListTdStatus}`}>
                      <PaymentVoucherStatusBadge status={row.status} />
                    </td>
                    <td className={financeMemo}>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Link
                          href={appendFinanceLegalEntityToPath(
                          `/finance/payment-vouchers/${row.id}`,
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
                          `/finance/payment-vouchers/${row.id}`,
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
                          `/finance/payment-vouchers/${row.id}`,
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
