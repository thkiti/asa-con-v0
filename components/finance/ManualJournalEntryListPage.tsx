"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { DocumentInquiryMoreFilter } from "@/components/finance/DocumentInquiryMoreFilter"
import { FilterSelectField, StatusFilterField } from "@/components/ui/FilterSelectField"
import { InquiryFilterActions } from "@/components/ui/InquiryFilterActions"
import { ManualJournalEntryStatusBadge } from "@/components/finance/ManualJournalEntryStatusBadge"
import { formatFinanceListDate } from "@/lib/finance-ui/format"
import { appendFinanceLegalEntityToPath } from "@/lib/finance-ui/finance-entity-scope"
import { useFinanceLegalEntityScope } from "@/lib/finance-ui/use-finance-legal-entity-scope"
import {
  formatManualJournalEntryDocumentNo,
  formatManualJournalEntryTypeLabel,
  MANUAL_JOURNAL_ENTRY_STATUSES,
  MANUAL_JOURNAL_ENTRY_TYPES,
} from "@/lib/finance-ui/manual-journal-entry-display"
import {
  defaultManualJournalEntryListUiFilter,
  toManualJournalEntryListFilter,
  type ManualJournalEntryListUiFilter,
} from "@/lib/finance-ui/manual-journal-entry-list-filter"
import {
  fetchManualJournalEntries,
  type ManualJournalEntryListItem,
} from "@/lib/finance-ui/manual-journal-entries"
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
  manualJournalEntryListFilterEntryType,
  manualJournalEntryListTable,
  manualJournalEntryListTdDate,
  manualJournalEntryListTdDescription,
  manualJournalEntryListTdDocNo,
  manualJournalEntryListTdLines,
  manualJournalEntryListTdStatus,
  voucherInquiryFilterBar,
  voucherInquiryFilterInput,
  voucherInquiryFilterNo,
  voucherInquiryFilterPostingState,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLabel, themeLinkMuted, themeTextSecondary } from "@/lib/theme/theme-classes"

export function ManualJournalEntryListPage() {
  const legalEntityCode = useFinanceLegalEntityScope()
  const [draft, setDraft] = useState<ManualJournalEntryListUiFilter>(
    defaultManualJournalEntryListUiFilter
  )
  const [applied, setApplied] = useState<ManualJournalEntryListUiFilter>(
    defaultManualJournalEntryListUiFilter
  )
  const [entries, setEntries] = useState<ManualJournalEntryListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const appliedFilterKey = useMemo(() => JSON.stringify(applied), [applied])
  const { isMoreFilterOpen, setIsMoreFilterOpen } =
    useInquiryMoreFilterOpen(appliedFilterKey)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchManualJournalEntries(
        legalEntityCode,
        toManualJournalEntryListFilter(applied)
      )
      setEntries(result.entries)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entries")
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
    const cleared = defaultManualJournalEntryListUiFilter()
    setDraft(cleared)
    setApplied(cleared)
  }

  return (
    <div className="space-y-4" data-testid="manual-journal-entry-list">
      <div className={manualJournalEntryListActionRow} data-testid="manual-journal-entry-actions">
        <Link
          href={appendFinanceLegalEntityToPath(
            "/finance/manual-journal-entries/new",
            legalEntityCode
          )}
          className={manualJournalEntryListActionPrimary}
          data-testid="new-manual-journal-entry"
        >
          New journal entry
        </Link>
        <button
          type="button"
          className={manualJournalEntryListActionSecondary}
          data-testid="manual-journal-entry-refresh"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      <div
        className={voucherInquiryFilterBar}
        data-testid="manual-journal-entry-filters"
      >
        <DocumentInquiryMoreFilter
          periodKey={draft.periodKey}
          onPeriodKeyChange={(value) =>
            setDraft((prev) => ({ ...prev, periodKey: value }))
          }
          periodTestId="manual-journal-entry-filter-period"
          from={draft.dateFrom}
          to={draft.dateTo}
          onFromChange={(value) =>
            setDraft((prev) => ({ ...prev, dateFrom: value }))
          }
          onToChange={(value) => setDraft((prev) => ({ ...prev, dateTo: value }))}
          testIdPrefix="manual-journal-entry"
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
            placeholder="MJV-…"
            data-testid="manual-journal-entry-filter-no"
          />
        </label>
        <StatusFilterField
          value={draft.status}
          onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))}
          emptyOption={{ label: "All" }}
          options={MANUAL_JOURNAL_ENTRY_STATUSES.map((status) => ({
            value: status,
            label: status,
          }))}
          data-testid="filter-status"
        />
        <FilterSelectField
          label="Entry type"
          wrapperClassName={manualJournalEntryListFilterEntryType}
          value={draft.entryType}
          onChange={(value) => setDraft((prev) => ({ ...prev, entryType: value }))}
          emptyOption={{ label: "All" }}
          options={MANUAL_JOURNAL_ENTRY_TYPES.map((type) => ({
            value: type,
            label: formatManualJournalEntryTypeLabel(type),
          }))}
          data-testid="filter-entry-type"
        />
        <FilterSelectField
          label="Post"
          wrapperClassName={voucherInquiryFilterPostingState}
          value={draft.postingState}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              postingState: value as ManualJournalEntryListUiFilter["postingState"],
            }))
          }
          options={FINANCE_DOCUMENT_INQUIRY_POSTING_STATE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          data-testid="manual-journal-entry-filter-post"
        />
        <InquiryFilterActions
          onPrimary={handleSearch}
          onClear={handleClear}
          primaryTestId="manual-journal-entry-search"
          clearTestId="manual-journal-entry-clear"
        />
      </div>

      {loading ? <p className={`text-sm ${themeTextSecondary}`}>Loading entries…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !error ? (
        <>
          <p className={`text-sm ${themeTextSecondary}`}>
            {total} entr{total === 1 ? "y" : "ies"}
          </p>
          <div className={financeTableScroll}>
            <table
              className={`${financeTable} ${manualJournalEntryListTable}`}
              data-testid="manual-journal-entry-table"
            >
              <thead>
                <tr>
                  <th className={financeTh}>Document no.</th>
                  <th className={financeTh}>Date</th>
                  <th className={financeTh}>Description</th>
                  <th className={financeThRight}>Lines</th>
                  <th className={financeThRight}>Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.id}>
                    <td className={manualJournalEntryListTdDocNo}>
                      <Link
                        href={appendFinanceLegalEntityToPath(
                          `/finance/manual-journal-entries/${row.id}`,
                          legalEntityCode
                        )}
                        className={`${themeLinkMuted} font-mono text-xs`}
                        data-testid={`entry-link-${row.id}`}
                      >
                        {formatManualJournalEntryDocumentNo(row.entryNo, row.entryType)}
                      </Link>
                    </td>
                    <td className={`${financeMemo} ${manualJournalEntryListTdDate}`}>
                      {formatFinanceListDate(row.entryDate)}
                    </td>
                    <td className={`${financeMemo} ${manualJournalEntryListTdDescription}`}>
                      {row.description ?? "—"}
                    </td>
                    <td className={`${financeNumber} ${manualJournalEntryListTdLines}`}>
                      {row.lineCount}
                    </td>
                    <td className={`${financeMemo} ${manualJournalEntryListTdStatus}`}>
                      <ManualJournalEntryStatusBadge status={row.status} />
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
