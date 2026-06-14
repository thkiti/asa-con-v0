"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { formatAmount } from "@/lib/finance-ui/format"
import { fetchOpeningBalancePostingVerification } from "@/lib/finance-ui/opening-balance"
import type { ManualJournalEntryPostingVerification } from "@/lib/finance/manual-journal-entry/manual-journal-entry-posting-verification-types"

type OpeningBalancePostingVerificationPanelProps = {
  entryId: string
  entryNo: string
  postedJournalEntryId: string | null
}

export function OpeningBalancePostingVerificationPanel({
  entryId,
  entryNo,
  postedJournalEntryId,
}: OpeningBalancePostingVerificationPanelProps) {
  const [verification, setVerification] =
    useState<ManualJournalEntryPostingVerification | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    void fetchOpeningBalancePostingVerification(entryId)
      .then(setVerification)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Verification failed")
      })
      .finally(() => setLoading(false))
  }, [entryId])

  if (loading) {
    return (
      <p className="text-sm text-zinc-500" data-testid="opb-verification-loading">
        Loading posting verification…
      </p>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-red-700" data-testid="opb-verification-error">
        {error}
      </p>
    )
  }

  if (!verification) return null

  return (
    <section
      className="rounded border border-emerald-200 bg-emerald-50/50 p-4 space-y-3"
      data-testid="opb-posting-verification"
    >
      <h3 className="text-sm font-semibold text-emerald-900">Posting verification</h3>

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p>
          <span className="text-zinc-600">Period:</span>{" "}
          <span className="font-mono">{verification.periodKey}</span>
        </p>
        <p data-testid="opb-verification-totals-match">
          <span className="text-zinc-600">Entry vs journal totals:</span>{" "}
          <span className={verification.totalsMatch ? "text-emerald-800" : "text-red-700"}>
            {verification.totalsMatch ? "Match" : "Mismatch"}
          </span>
        </p>
        <p>
          <span className="text-zinc-600">Entry debit / credit:</span>{" "}
          <span className="tabular-nums">
            {formatAmount(verification.entryTotalDebit)} /{" "}
            {formatAmount(verification.entryTotalCredit)}
          </span>
        </p>
        <p>
          <span className="text-zinc-600">Journal debit / credit:</span>{" "}
          <span className="tabular-nums">
            {formatAmount(verification.journalTotalDebit ?? "0")} /{" "}
            {formatAmount(verification.journalTotalCredit ?? "0")}
          </span>
        </p>
        <p data-testid="opb-verification-tb-balanced">
          <span className="text-zinc-600">Trial balance ({verification.periodKey}):</span>{" "}
          <span
            className={
              verification.trialBalanceBalanced ? "text-emerald-800" : "text-red-700"
            }
          >
            {verification.trialBalanceBalanced == null
              ? "Unavailable"
              : verification.trialBalanceBalanced
                ? "Balanced"
                : "Out of balance"}
          </span>
        </p>
      </div>

      {postedJournalEntryId ? (
        <p className="text-sm">
          <Link
            href={`/finance/journal-entries/${postedJournalEntryId}`}
            className="underline text-zinc-700"
            data-testid="opb-verification-journal-link"
          >
            View posted GL journal
          </Link>
          {" · "}
          <span className="font-mono text-xs text-zinc-500">{entryNo}</span>
        </p>
      ) : null}

      {verification.accountChecks.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-emerald-200 text-left text-zinc-600">
                <th className="px-2 py-1">Account</th>
                <th className="px-2 py-1 text-right">Entry Dr</th>
                <th className="px-2 py-1 text-right">Entry Cr</th>
                <th className="px-2 py-1 text-right">GL closing</th>
                <th className="px-2 py-1">In GL</th>
              </tr>
            </thead>
            <tbody>
              {verification.accountChecks.map((row) => (
                <tr key={row.accountCode} className="border-b border-emerald-100">
                  <td className="px-2 py-1 font-mono">
                    {row.accountCode}{" "}
                    <span className="font-sans text-zinc-500">{row.accountName}</span>
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {formatAmount(row.entryDebit)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {formatAmount(row.entryCredit)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {formatAmount(row.closingBalance)}
                  </td>
                  <td className="px-2 py-1">
                    {row.sourceRefMatches ? (
                      <span className="text-emerald-800">Yes</span>
                    ) : (
                      <span className="text-red-700">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
