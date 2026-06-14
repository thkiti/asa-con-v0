"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ManualJournalEntryStatusBadge } from "@/components/finance/ManualJournalEntryStatusBadge"
import { formatDateTime } from "@/lib/finance-ui/format"
import {
  formatManualJournalEntryDocumentNo,
  formatManualJournalEntryTypeLabel,
  MANUAL_JOURNAL_ENTRY_STATUSES,
  MANUAL_JOURNAL_ENTRY_TYPES,
  type ManualJournalEntryStatusCode,
  type ManualJournalEntryTypeCode,
} from "@/lib/finance-ui/manual-journal-entry-display"
import {
  fetchManualJournalEntries,
  type ManualJournalEntryListFilterInput,
  type ManualJournalEntryListItem,
} from "@/lib/finance-ui/manual-journal-entries"
import {
  getLegalEntityDisplayName,
  LEGAL_ENTITY_CODES,
  type DocumentEntityCode,
} from "@/lib/legal-entity/constants"

const ALL = ""

type FilterState = {
  legalEntityCode: string
  status: string
  entryType: string
  dateFrom: string
  dateTo: string
}

const defaultFilter: FilterState = {
  legalEntityCode: ALL,
  status: ALL,
  entryType: ALL,
  dateFrom: "",
  dateTo: "",
}

function toListFilter(filter: FilterState): ManualJournalEntryListFilterInput {
  return {
    ...(filter.legalEntityCode ? { legalEntityCode: filter.legalEntityCode as DocumentEntityCode } : {}),
    ...(filter.status ? { status: filter.status as ManualJournalEntryStatusCode } : {}),
    ...(filter.entryType ? { entryType: filter.entryType as ManualJournalEntryTypeCode } : {}),
    ...(filter.dateFrom ? { dateFrom: filter.dateFrom } : {}),
    ...(filter.dateTo ? { dateTo: filter.dateTo } : {}),
    limit: 50,
    offset: 0,
  }
}

export function ManualJournalEntryListPage() {
  const [filter, setFilter] = useState<FilterState>(defaultFilter)
  const [entries, setEntries] = useState<ManualJournalEntryListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchManualJournalEntries(toListFilter(filter))
      setEntries(result.entries)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entries")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4" data-testid="manual-journal-entry-list">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">Legal entity</span>
          <select
            className="rounded border border-zinc-300 px-2 py-1"
            value={filter.legalEntityCode}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, legalEntityCode: e.target.value }))
            }
            data-testid="filter-legal-entity"
          >
            <option value={ALL}>All</option>
            {LEGAL_ENTITY_CODES.map((code) => (
              <option key={code} value={code}>
                {getLegalEntityDisplayName(code)} ({code})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">Status</span>
          <select
            className="rounded border border-zinc-300 px-2 py-1"
            value={filter.status}
            onChange={(e) => setFilter((prev) => ({ ...prev, status: e.target.value }))}
            data-testid="filter-status"
          >
            <option value={ALL}>All</option>
            {MANUAL_JOURNAL_ENTRY_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">Entry type</span>
          <select
            className="rounded border border-zinc-300 px-2 py-1"
            value={filter.entryType}
            onChange={(e) => setFilter((prev) => ({ ...prev, entryType: e.target.value }))}
            data-testid="filter-entry-type"
          >
            <option value={ALL}>All</option>
            {MANUAL_JOURNAL_ENTRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatManualJournalEntryTypeLabel(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">Date from</span>
          <input
            type="date"
            className="rounded border border-zinc-300 px-2 py-1"
            value={filter.dateFrom}
            onChange={(e) => setFilter((prev) => ({ ...prev, dateFrom: e.target.value }))}
            data-testid="filter-date-from"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">Date to</span>
          <input
            type="date"
            className="rounded border border-zinc-300 px-2 py-1"
            value={filter.dateTo}
            onChange={(e) => setFilter((prev) => ({ ...prev, dateTo: e.target.value }))}
            data-testid="filter-date-to"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/finance/manual-journal-entries/new"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white"
          data-testid="new-manual-journal-entry"
        >
          New journal entry
        </Link>
        <button
          type="button"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      {loading ? <p className="text-sm text-zinc-500">Loading entries…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !error ? (
        <>
          <p className="text-sm text-zinc-600">
            {total} entr{total === 1 ? "y" : "ies"}
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="px-2 py-1">Document no</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1">Entity</th>
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1">Description</th>
                  <th className="px-2 py-1">Lines</th>
                  <th className="px-2 py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100">
                    <td className="px-2 py-1">
                      <Link
                        href={`/finance/manual-journal-entries/${row.id}`}
                        className="font-mono text-xs underline"
                        data-testid={`entry-link-${row.id}`}
                      >
                        {formatManualJournalEntryDocumentNo(row.entryNo, row.entryType)}
                      </Link>
                    </td>
                    <td className="px-2 py-1 text-xs">
                      {formatManualJournalEntryTypeLabel(row.entryType)}
                    </td>
                    <td className="px-2 py-1 text-xs">
                      {getLegalEntityDisplayName(row.legalEntityCode as DocumentEntityCode)}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {formatDateTime(row.entryDate)}
                    </td>
                    <td className="px-2 py-1 text-zinc-700">
                      {row.description ?? "—"}
                    </td>
                    <td className="px-2 py-1 tabular-nums">{row.lineCount}</td>
                    <td className="px-2 py-1">
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
