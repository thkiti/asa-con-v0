"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { AccountingPeriodInput } from "@/components/finance/AccountingPeriodInput"
import {
  fetchJournalEntries,
  type JournalListFilter,
} from "@/lib/finance-ui/journal-entries"
import type { JournalListRow } from "@/lib/finance-ui/types"
import { formatAmount, formatDateTime } from "@/lib/finance-ui/format"
import {
  financeMemo,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  financeThRight,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

export function JournalEntryListPage() {
  const [filter, setFilter] = useState<JournalListFilter>({
    branchId: "branch-1",
    limit: 50,
    offset: 0,
  })
  const [journals, setJournals] = useState<JournalListRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchJournalEntries(filter)
      setJournals(result.journals)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load journals")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">Branch</span>
          <input
            className="rounded border border-zinc-300 px-2 py-1"
            value={filter.branchId ?? ""}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, branchId: e.target.value, offset: 0 }))
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">Period key</span>
          <AccountingPeriodInput
            className="rounded border border-zinc-300 px-2 py-1"
            value={filter.periodKey ?? ""}
            onChange={(value) =>
              setFilter((prev) => ({
                ...prev,
                periodKey: value || undefined,
                offset: 0,
              }))
            }
          />
        </label>
        <Link
          href="/finance/journal-entries/new"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white"
        >
          New manual journal
        </Link>
      </div>

      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && !error ? (
        <>
          <p className="text-sm text-zinc-600">
            {total} journal{total === 1 ? "" : "s"} (manual and reversals)
          </p>
          <div className={financeTableScroll}>
            <table className={financeTable}>
              <thead>
                <tr>
                  <th className={financeTh}>Date</th>
                  <th className={financeTh}>Voucher</th>
                  <th className={financeTh}>Type</th>
                  <th className={financeTh}>Description</th>
                  <th className={financeThRight}>Debit</th>
                  <th className={financeThRight}>Credit</th>
                  <th className={financeTh}>Status</th>
                </tr>
              </thead>
              <tbody>
                {journals.map((row) => (
                  <tr key={row.id}>
                    <td className={financeMemo}>{formatDateTime(row.date)}</td>
                    <td>
                      <Link
                        href={`/finance/journal-entries/${row.id}`}
                        className={`font-mono text-xs ${themeLinkMuted}`}
                      >
                        {row.voucherNo}
                      </Link>
                    </td>
                    <td className={financeMemo}>{row.refType}</td>
                    <td className={financeMemo}>{row.description ?? "—"}</td>
                    <td className={financeNumber}>{formatAmount(row.totalDebit)}</td>
                    <td className={financeNumber}>{formatAmount(row.totalCredit)}</td>
                    <td className={financeMemo}>
                      {row.isReversal ? "Reversal" : row.isReversed ? "Reversed" : "Posted"}
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
