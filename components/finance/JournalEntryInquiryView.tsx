"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  fetchJournalInquiry,
  reverseJournal,
} from "@/lib/finance-ui/journal-entries"
import { formatAmount, formatDateTime } from "@/lib/finance-ui/format"
import type { JournalInquiryResult } from "@/lib/finance-ui/types"

type JournalEntryInquiryViewProps = {
  journalEntryId: string
}

export function JournalEntryInquiryView({ journalEntryId }: JournalEntryInquiryViewProps) {
  const [journal, setJournal] = useState<JournalInquiryResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReverseDialog, setShowReverseDialog] = useState(false)
  const [reversalDate, setReversalDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [reversalReason, setReversalReason] = useState("")
  const [reversing, setReversing] = useState(false)
  const [reverseError, setReverseError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchJournalInquiry(journalEntryId)
      setJournal(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load journal")
    } finally {
      setLoading(false)
    }
  }, [journalEntryId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleReverse() {
    if (!reversalReason.trim()) {
      setReverseError("Reversal reason is required.")
      return
    }
    setReversing(true)
    setReverseError(null)
    try {
      const result = await reverseJournal(journalEntryId, {
        reversalDate,
        reason: reversalReason.trim(),
      })
      setShowReverseDialog(false)
      window.location.assign(`/finance/journal-entries/${result.journalEntryId}`)
    } catch (err) {
      setReverseError(err instanceof Error ? err.message : "Reversal failed")
    } finally {
      setReversing(false)
    }
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>
  if (error) return <p className="text-sm text-red-700">{error}</p>
  if (!journal) return null

  const canReverse = !journal.isReversal && !journal.isReversed

  return (
    <div className="space-y-6">
      <section className="rounded border border-zinc-200 p-4">
        <h2 className="font-medium text-zinc-900">Journal header</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Voucher</dt>
            <dd className="font-mono">{journal.voucherNo}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Type</dt>
            <dd>{journal.refType}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Date</dt>
            <dd>{formatDateTime(journal.date)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Posted at</dt>
            <dd>{formatDateTime(journal.postedAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Description</dt>
            <dd>{journal.description ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded border border-zinc-200 p-4">
        <h2 className="font-medium text-zinc-900">Lineage</h2>
        <div className="mt-3 space-y-2 text-sm">
          {journal.reverses ? (
            <p>
              Reverses{" "}
              <Link
                href={`/finance/journal-entries/${journal.reverses.id}`}
                className="font-mono underline"
              >
                {journal.reverses.voucherNo}
              </Link>
            </p>
          ) : null}
          <p className="font-mono text-zinc-800">{journal.voucherNo}</p>
          {journal.reversedBy ? (
            <p>
              ↓ Reversed by{" "}
              <Link
                href={`/finance/journal-entries/${journal.reversedBy.id}`}
                className="font-mono underline"
              >
                {journal.reversedBy.voucherNo}
              </Link>
            </p>
          ) : journal.isReversed ? null : (
            <p className="text-zinc-500">No reversal posted</p>
          )}
        </div>
      </section>

      <section className="rounded border border-zinc-200 p-4">
        <h2 className="font-medium text-zinc-900">Journal lines</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="px-2 py-1">#</th>
                <th className="px-2 py-1">Account</th>
                <th className="px-2 py-1 text-right">Debit</th>
                <th className="px-2 py-1 text-right">Credit</th>
                <th className="px-2 py-1">Memo</th>
              </tr>
            </thead>
            <tbody>
              {journal.lines.map((line) => (
                <tr key={line.id} className="border-b border-zinc-100">
                  <td className="px-2 py-1 tabular-nums">{line.lineNo}</td>
                  <td className="px-2 py-1">
                    <span className="font-mono text-xs">{line.accountCode}</span>
                    <span className="ml-2 text-zinc-700">{line.accountName}</span>
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {formatAmount(line.debit)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {formatAmount(line.credit)}
                  </td>
                  <td className="px-2 py-1 text-zinc-600">{line.memo ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {canReverse ? (
        <div>
          <button
            type="button"
            className="rounded border border-red-300 px-4 py-2 text-sm text-red-800"
            onClick={() => setShowReverseDialog(true)}
          >
            Reverse journal
          </button>
        </div>
      ) : null}

      {showReverseDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded bg-white p-6 shadow-lg">
            <h3 className="text-lg font-medium">Confirm reversal</h3>
            <p className="mt-2 text-sm text-zinc-600">
              This creates a new reversal journal with swapped debit/credit. The original
              journal remains unchanged.
            </p>
            <label className="mt-4 flex flex-col gap-1 text-sm">
              <span className="text-zinc-600">Reversal date</span>
              <input
                type="date"
                className="rounded border border-zinc-300 px-2 py-1"
                value={reversalDate}
                onChange={(e) => setReversalDate(e.target.value)}
              />
            </label>
            <label className="mt-3 flex flex-col gap-1 text-sm">
              <span className="text-zinc-600">Reason (required)</span>
              <textarea
                className="rounded border border-zinc-300 px-2 py-1"
                rows={3}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
              />
            </label>
            {reverseError ? (
              <p className="mt-2 text-sm text-red-700">{reverseError}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-zinc-300 px-3 py-1 text-sm"
                disabled={reversing}
                onClick={() => setShowReverseDialog(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-red-800 px-3 py-1 text-sm text-white disabled:opacity-50"
                disabled={reversing || !reversalReason.trim()}
                onClick={() => void handleReverse()}
              >
                {reversing ? "Reversing…" : "Confirm reversal"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
