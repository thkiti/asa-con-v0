"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { FinanceDocumentCanonicalHeader } from "@/components/finance/FinanceDocumentCanonicalHeader"
import { formatAmount } from "@/lib/finance-ui/format"
import type { FinanceDocumentHeaderContext } from "@/lib/finance-ui/finance-document-display"
import { fetchOpeningBalancePostingVerification } from "@/lib/finance-ui/opening-balance"
import type { ManualJournalEntryPostingVerification } from "@/lib/finance/manual-journal-entry/manual-journal-entry-posting-verification-types"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import {
  financeAccountName,
  financeNumber,
  financeTableCompact,
  financeTableScroll,
  financeTh,
  financeThRight,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type OpeningBalancePostingVerificationPanelProps = {
  entryId: string
  postedJournalEntryId: string | null
  headerContext: FinanceDocumentHeaderContext
}

export function OpeningBalancePostingVerificationPanel({
  entryId,
  postedJournalEntryId,
  headerContext,
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
      <FinanceDocumentCanonicalHeader {...headerContext} />

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
            className={`text-sm ${themeLinkMuted}`}
            data-testid="opb-verification-journal-link"
          >
            View posted GL journal
          </Link>
        </p>
      ) : null}

      {verification.accountChecks.length > 0 ? (
        <div className={financeTableScroll}>
          <table className={financeTableCompact}>
            <thead>
              <tr>
                <th className={financeTh}>Account</th>
                <th className={financeThRight}>Entry Dr</th>
                <th className={financeThRight}>Entry Cr</th>
                <th className={financeThRight}>GL closing</th>
                <th className={financeTh}>In GL</th>
              </tr>
            </thead>
            <tbody>
              {verification.accountChecks.map((row) => (
                <tr key={row.lineId}>
                  <td>
                    <FinanceAccountDisplay
                      accountCode={row.accountCode}
                      accountName={row.accountName}
                      data-testid={`opb-verification-account-${row.accountCode}`}
                    />
                  </td>
                  <td className={financeNumber}>{formatAmount(row.entryDebit)}</td>
                  <td className={financeNumber}>{formatAmount(row.entryCredit)}</td>
                  <td className={financeNumber}>{formatAmount(row.closingBalance)}</td>
                  <td className={financeAccountName}>
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
