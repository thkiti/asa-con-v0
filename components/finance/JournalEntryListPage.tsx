"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  fetchJournalEntries,
  type JournalListFilter,
} from "@/lib/finance-ui/journal-entries"
import type { JournalListRow } from "@/lib/finance-ui/types"
import { formatAmount, formatDateTime } from "@/lib/finance-ui/format"

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
          <input
            className="rounded border border-zinc-300 px-2 py-1"
            placeholder="2026-05"
            value={filter.periodKey ?? ""}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                periodKey: e.target.value || undefined,
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
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1">Voucher</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1">Description</th>
                  <th className="px-2 py-1 text-right">Debit</th>
                  <th className="px-2 py-1 text-right">Credit</th>
                  <th className="px-2 py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {journals.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100">
                    <td className="px-2 py-1 whitespace-nowrap">
                      {formatDateTime(row.date)}
                    </td>
                    <td className="px-2 py-1">
                      <Link
                        href={`/finance/journal-entries/${row.id}`}
                        className="font-mono text-xs underline"
                      >
                        {row.voucherNo}
                      </Link>
                    </td>
                    <td className="px-2 py-1 text-xs">{row.refType}</td>
                    <td className="px-2 py-1 text-zinc-700">
                      {row.description ?? "—"}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {formatAmount(row.totalDebit)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {formatAmount(row.totalCredit)}
                    </td>
                    <td className="px-2 py-1 text-xs">
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
