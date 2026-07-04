"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ManualJournalEntryStatusBadge } from "@/components/finance/ManualJournalEntryStatusBadge"
import { formatDateTime } from "@/lib/finance-ui/format"
import { formatManualJournalEntryDocumentNo } from "@/lib/finance-ui/manual-journal-entry-display"
import { useFinanceLegalEntityScope } from "@/lib/finance-ui/use-finance-legal-entity-scope"
import {
  fetchOpeningBalanceEntries,
  type OpeningBalanceListFilterInput,
} from "@/lib/finance-ui/opening-balance"
import type { ManualJournalEntryListItem } from "@/lib/finance-ui/manual-journal-entries"
import {
  formatEntityShort,
  LEGAL_ENTITY_CODES,
  type DocumentEntityCode,
} from "@/lib/legal-entity"
import {
  financeMemo,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

const ALL = ""

type FilterState = {
  legalEntityCode: string
  status: string
  dateFrom: string
  dateTo: string
}

const defaultFilter: FilterState = {
  legalEntityCode: ALL,
  status: ALL,
  dateFrom: "",
  dateTo: "",
}

function toListFilter(filter: FilterState): OpeningBalanceListFilterInput {
  return {
    ...(filter.legalEntityCode
      ? { legalEntityCode: filter.legalEntityCode as DocumentEntityCode }
      : {}),
    ...(filter.status ? { status: filter.status as ManualJournalEntryListItem["status"] } : {}),
    ...(filter.dateFrom ? { dateFrom: filter.dateFrom } : {}),
    ...(filter.dateTo ? { dateTo: filter.dateTo } : {}),
    limit: 50,
    offset: 0,
  }
}

const OPB_STATUSES = ["DRAFT", "SUBMITTED", "CONFIRMED", "POSTED", "CANCELLED"] as const

export function OpeningBalanceHubPage() {
  const scopeLegalEntityCode = useFinanceLegalEntityScope()
  const [filter, setFilter] = useState<FilterState>(defaultFilter)
  const [entries, setEntries] = useState<ManualJournalEntryListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const listEntity = (
        filter.legalEntityCode
          ? filter.legalEntityCode
          : scopeLegalEntityCode
      ) as DocumentEntityCode
      const result = await fetchOpeningBalanceEntries(
        listEntity,
        toListFilter(filter)
      )
      setEntries(result.entries)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load opening balances")
    } finally {
      setLoading(false)
    }
  }, [filter, scopeLegalEntityCode])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4" data-testid="opening-balance-hub">
      <p className="text-sm text-zinc-600">
        Opening balance journals use document code OPB. Only balance-sheet accounts (asset,
        liability, equity) are allowed.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">Legal entity</span>
          <select
            className="rounded border border-zinc-300 px-2 py-1"
            value={filter.legalEntityCode}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, legalEntityCode: e.target.value }))
            }
            data-testid="opb-filter-legal-entity"
          >
            <option value={ALL}>All</option>
            {LEGAL_ENTITY_CODES.map((code) => (
              <option key={code} value={code}>
                {formatEntityShort(code)}
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
            data-testid="opb-filter-status"
          >
            <option value={ALL}>All</option>
            {OPB_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
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
            data-testid="opb-filter-date-from"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">Date to</span>
          <input
            type="date"
            className="rounded border border-zinc-300 px-2 py-1"
            value={filter.dateTo}
            onChange={(e) => setFilter((prev) => ({ ...prev, dateTo: e.target.value }))}
            data-testid="opb-filter-date-to"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/finance/opening-balance/new"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white"
          data-testid="new-opening-balance"
        >
          New opening balance
        </Link>
        <button
          type="button"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      {loading ? <p className="text-sm text-zinc-500">Loading opening balances…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !error ? (
        <>
          <p className="text-sm text-zinc-600">
            {total} opening balance entr{total === 1 ? "y" : "ies"}
          </p>
          <div className={financeTableScroll}>
            <table className={financeTable}>
              <thead>
                <tr>
                  <th className={financeTh}>Document no</th>
                  <th className={financeTh}>Entity</th>
                  <th className={financeTh}>Date</th>
                  <th className={financeTh}>Description</th>
                  <th className={financeTh}>Lines</th>
                  <th className={financeTh}>Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        href={`/finance/opening-balance/${row.id}`}
                        className={`font-mono text-xs ${themeLinkMuted}`}
                        data-testid={`opb-entry-link-${row.id}`}
                      >
                        {formatManualJournalEntryDocumentNo(row.entryNo, row.entryType)}
                      </Link>
                    </td>
                    <td className={financeMemo}>
                      {formatEntityShort(row.legalEntityCode)}
                    </td>
                    <td className={financeMemo}>{formatDateTime(row.entryDate)}</td>
                    <td className={financeMemo}>{row.description ?? "—"}</td>
                    <td className={financeNumber}>{row.lineCount}</td>
                    <td className={financeMemo}>
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
