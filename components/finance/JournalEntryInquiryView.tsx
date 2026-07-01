"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { FinanceDocumentAccountingSection } from "@/components/finance/FinanceDocumentAccountingSection"
import { FinanceDocumentCanonicalHeader } from "@/components/finance/FinanceDocumentCanonicalHeader"
import { FinanceDocumentPageShell } from "@/components/finance/FinanceDocumentPageShell"
import {
  fetchJournalInquiry,
  reverseJournal,
} from "@/lib/finance-ui/journal-entries"
import { formatAmount, formatDateTime } from "@/lib/finance-ui/format"
import {
  buildFinanceJournalInquiryPath,
  resolveFinanceDocumentBackLink,
} from "@/lib/finance-ui/finance-navigation"
import type { JournalInquiryResult } from "@/lib/finance-ui/types"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import {
  financeMemo,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  financeThRight,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type JournalEntryInquiryViewProps = {
  journalEntryId: string
  /** Optional preloaded journal (tests); skips client fetch when provided. */
  initialJournal?: JournalInquiryResult | null
  /** returnTo query value (from page searchParams or tests). */
  returnTo?: string | null
}

function JournalLinesTable({ lines }: { lines: JournalInquiryResult["lines"] }) {
  return (
    <div
      className={`${financeTableScroll} w-full max-w-full`}
      data-testid="journal-inquiry-lines-table"
    >
      <table className={`${financeTable} w-full`}>
        <thead>
          <tr>
            <th className={financeTh}>#</th>
            <th className={financeTh}>Account</th>
            <th className={financeThRight}>Debit</th>
            <th className={financeThRight}>Credit</th>
            <th className={financeTh}>Memo</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id}>
              <td className={financeNumber}>{line.lineNo}</td>
              <td>
                <FinanceAccountDisplay
                  accountCode={line.accountCode}
                  accountName={line.accountName}
                  data-testid={`journal-line-account-${line.id}`}
                />
              </td>
              <td className={financeNumber}>{formatAmount(line.debit)}</td>
              <td className={financeNumber}>{formatAmount(line.credit)}</td>
              <td className={financeMemo}>{line.memo ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function JournalInquiryLineage({
  journal,
  returnTo,
}: {
  journal: JournalInquiryResult
  returnTo?: string | null
}) {
  return (
    <div className="space-y-2 text-sm">
      {journal.reverses ? (
        <p>
          Reverses{" "}
          <Link
            href={buildFinanceJournalInquiryPath(journal.reverses.id, returnTo)}
            className={`font-mono ${themeLinkMuted}`}
          >
            {journal.reverses.voucherNo}
          </Link>
        </p>
      ) : null}
      {journal.reversedBy ? (
        <p>
          ↓ Reversed by{" "}
          <Link
            href={buildFinanceJournalInquiryPath(journal.reversedBy.id, returnTo)}
            className={`font-mono ${themeLinkMuted}`}
          >
            {journal.reversedBy.voucherNo}
          </Link>
        </p>
      ) : journal.isReversed ? null : (
        <p className="text-zinc-500">No reversal posted</p>
      )}
    </div>
  )
}

export function JournalEntryInquiryView({
  journalEntryId,
  initialJournal = null,
  returnTo = null,
}: JournalEntryInquiryViewProps) {
  const [journal, setJournal] = useState<JournalInquiryResult | null>(initialJournal)
  const [loading, setLoading] = useState(initialJournal == null)
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
    if (initialJournal != null) return
    void load()
  }, [load, initialJournal])

  const backLink = useMemo(() => {
    if (!journal) return null
    const header = journal.documentHeader
    return resolveFinanceDocumentBackLink({
      returnTo,
      refType: journal.refType,
      refId: journal.refId,
      documentNo: header?.documentNo,
      entryType: header?.entryType ?? null,
      moduleDefaultHref: "/finance/journal-entries",
      moduleDefaultLabel: "← Manual journals",
    })
  }, [journal, returnTo])

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
      window.location.assign(
        buildFinanceJournalInquiryPath(result.journalEntryId, returnTo)
      )
    } catch (err) {
      setReverseError(err instanceof Error ? err.message : "Reversal failed")
    } finally {
      setReversing(false)
    }
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>
  if (error) return <p className="text-sm text-red-700">{error}</p>
  if (!journal || !backLink) return null

  const canReverse = !journal.isReversal && !journal.isReversed
  const isOperationalDocument = journal.documentHeader != null

  const reverseDialog = showReverseDialog ? (
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
  ) : null

  if (isOperationalDocument) {
    return (
      <>
        <FinanceDocumentPageShell
          backHref={backLink.href}
          backLabel={backLink.label}
        >
          <div className="w-full max-w-full space-y-4" data-testid="journal-entry-inquiry">
            <FinanceDocumentCanonicalHeader {...journal.documentHeader!} />
            <FinanceDocumentAccountingSection
              voucherNo={journal.voucherNo}
              refType={journal.refType}
              postedAt={journal.postedAt}
            />
            <JournalLinesTable lines={journal.lines} />
            <section
              className="border-t border-zinc-200 pt-4"
              data-testid="journal-inquiry-lineage"
            >
              <h3 className="text-sm font-medium text-zinc-800">Lineage</h3>
              <div className="mt-2">
                <JournalInquiryLineage journal={journal} returnTo={returnTo} />
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
          </div>
        </FinanceDocumentPageShell>
        {reverseDialog}
      </>
    )
  }

  return (
    <>
      <Link href={backLink.href} className={`text-sm ${themeLinkMuted}`}>
        {backLink.label}
      </Link>
      <h1 className="mt-4 text-xl font-semibold" data-testid="journal-inquiry-dashboard-title">
        Journal inquiry
      </h1>
      <p className="mt-2 text-zinc-600">
        Voucher, journal lines, reversal lineage, and reversal status.
      </p>
      <div className="mt-6 space-y-4" data-testid="journal-entry-inquiry">
        <section className="rounded border border-zinc-200 p-4">
          <h2 className="font-medium text-zinc-900">Journal inquiry</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Journal Type</dt>
              <dd>{journal.refType}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Date</dt>
              <dd>{formatDateTime(journal.date)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Description</dt>
              <dd>{journal.description ?? "—"}</dd>
            </div>
          </dl>
          <FinanceDocumentAccountingSection
            voucherNo={journal.voucherNo}
            refType={journal.refType}
            postedAt={journal.postedAt}
          />
        </section>

        <section className="rounded border border-zinc-200 p-4">
          <h2 className="font-medium text-zinc-900">Lineage</h2>
          <div className="mt-3">
            <JournalInquiryLineage journal={journal} returnTo={returnTo} />
          </div>
        </section>

        <section className="rounded border border-zinc-200 p-4">
          <h2 className="font-medium text-zinc-900">Journal lines</h2>
          <div className="mt-3">
            <JournalLinesTable lines={journal.lines} />
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
      </div>
      {reverseDialog}
    </>
  )
}
