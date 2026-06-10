"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { postManualJournal } from "@/lib/finance-ui/journal-entries"
import { formatAmount } from "@/lib/finance-ui/format"

type GridRow = {
  key: string
  accountCode: string
  debit: string
  credit: string
  memo: string
}

function emptyRow(): GridRow {
  return {
    key: crypto.randomUUID(),
    accountCode: "",
    debit: "",
    credit: "",
    memo: "",
  }
}

function parseAmount(value: string): number {
  const n = Number(value.trim() || "0")
  return Number.isFinite(n) ? n : 0
}

export function ManualJournalEntryPage() {
  const [branchId, setBranchId] = useState("branch-1")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState("")
  const [refNo, setRefNo] = useState("")
  const [rows, setRows] = useState<GridRow[]>([emptyRow(), emptyRow()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [postedJournalId, setPostedJournalId] = useState<string | null>(null)

  const totals = useMemo(() => {
    let debit = 0
    let credit = 0
    for (const row of rows) {
      debit += parseAmount(row.debit)
      credit += parseAmount(row.credit)
    }
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.0001 }
  }, [rows])

  function updateRow(key: string, patch: Partial<GridRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length <= 2 ? prev : prev.filter((row) => row.key !== key)))
  }

  async function handlePost() {
    setError(null)
    setPostedJournalId(null)

    const lines = rows
      .map((row) => ({
        accountCode: row.accountCode.trim(),
        debit: row.debit.trim() || "0",
        credit: row.credit.trim() || "0",
        memo: row.memo.trim() || null,
      }))
      .filter((line) => line.accountCode || parseAmount(line.debit) || parseAmount(line.credit))

    if (lines.length < 2) {
      setError("Enter at least two lines with account codes.")
      return
    }
    if (!totals.balanced) {
      setError("Journal must balance before posting.")
      return
    }
    if (!branchId.trim()) {
      setError("Branch is required.")
      return
    }

    setSubmitting(true)
    try {
      const result = await postManualJournal({
        branchId: branchId.trim(),
        date,
        description: description.trim() || null,
        refNo: refNo.trim() || null,
        idempotencyKey: crypto.randomUUID(),
        lines,
      })
      setPostedJournalId(result.journalEntryId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Posting failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600">
        Post a balanced manual journal directly to the GL. No draft workflow — posting is
        immediate and immutable.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">Branch</span>
          <input
            className="rounded border border-zinc-300 px-2 py-1"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600">Date</span>
          <input
            type="date"
            className="rounded border border-zinc-300 px-2 py-1"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-zinc-600">Description</span>
          <input
            className="rounded border border-zinc-300 px-2 py-1"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-zinc-600">Reference no (optional)</span>
          <input
            className="rounded border border-zinc-300 px-2 py-1"
            value={refNo}
            onChange={(e) => setRefNo(e.target.value)}
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="px-2 py-1">Account code</th>
              <th className="px-2 py-1 text-right">Debit</th>
              <th className="px-2 py-1 text-right">Credit</th>
              <th className="px-2 py-1">Memo</th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-zinc-100">
                <td className="px-2 py-1">
                  <input
                    className="w-full rounded border border-zinc-300 px-2 py-1 font-mono text-xs"
                    value={row.accountCode}
                    onChange={(e) => updateRow(row.key, { accountCode: e.target.value })}
                    placeholder="1100"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-full rounded border border-zinc-300 px-2 py-1 text-right tabular-nums"
                    value={row.debit}
                    onChange={(e) => updateRow(row.key, { debit: e.target.value })}
                    inputMode="decimal"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-full rounded border border-zinc-300 px-2 py-1 text-right tabular-nums"
                    value={row.credit}
                    onChange={(e) => updateRow(row.key, { credit: e.target.value })}
                    inputMode="decimal"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-full rounded border border-zinc-300 px-2 py-1"
                    value={row.memo}
                    onChange={(e) => updateRow(row.key, { memo: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1">
                  <button
                    type="button"
                    className="text-xs text-zinc-500 underline"
                    onClick={() => removeRow(row.key)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-300 font-medium">
              <td className="px-2 py-2">Totals</td>
              <td className="px-2 py-2 text-right tabular-nums">
                {formatAmount(String(totals.debit))}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {formatAmount(String(totals.credit))}
              </td>
              <td className="px-2 py-2" colSpan={2}>
                <span
                  className={
                    totals.balanced ? "text-emerald-700" : "text-red-700"
                  }
                >
                  {totals.balanced ? "Balanced" : "Out of balance"}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded border border-zinc-300 px-3 py-1 text-sm"
          onClick={addRow}
        >
          Add line
        </button>
        <button
          type="button"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={submitting || !totals.balanced}
          onClick={() => void handlePost()}
        >
          {submitting ? "Posting…" : "Post journal"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {postedJournalId ? (
        <p className="text-sm text-emerald-800">
          Posted.{" "}
          <Link
            href={`/finance/journal-entries/${postedJournalId}`}
            className="underline"
          >
            View journal inquiry
          </Link>
        </p>
      ) : null}
    </div>
  )
}
