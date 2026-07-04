import Link from "next/link"
import type { BankCashCheckReconciliationEvidence } from "@/lib/finance/bank-cash-check"
import { formatBankCashCheckReconciliationStatusLabel } from "@/lib/finance-ui/bank-cash-check-reconciliation-evidence"
import {
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
} from "@/lib/finance-ui/finance-visual-classes"

type BankCashCheckReconciliationEvidencePanelProps = {
  evidence: BankCashCheckReconciliationEvidence | null
  loading: boolean
  periodKey: string
  bankAccountId: string | null
}

function statusClassName(status: BankCashCheckReconciliationEvidence["status"]): string {
  switch (status) {
    case "COMPLETE":
      return "rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800"
    case "VARIANCE":
      return "rounded border border-red-200 bg-red-50 px-2 py-0.5 text-red-800"
    case "IN_PROGRESS":
      return "rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800"
    default:
      return "rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-zinc-700"
  }
}

export function BankCashCheckReconciliationEvidencePanel({
  evidence,
  loading,
  periodKey,
  bankAccountId,
}: BankCashCheckReconciliationEvidencePanelProps) {
  const bankCashCheckHref =
    periodKey && bankAccountId
      ? `/finance/bank-cash?periodKey=${encodeURIComponent(periodKey)}&bankAccountId=${encodeURIComponent(bankAccountId)}`
      : "/finance/bank-cash"

  return (
    <section
      className="space-y-3 rounded border border-zinc-200 p-4"
      data-testid="bank-cash-check-reconciliation-evidence"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Bank Cash Check evidence
        </h2>
        <Link href={bankCashCheckHref} className="text-xs text-zinc-600 underline">
          Open Bank Cash Check
        </Link>
      </div>

      <p className="text-sm text-zinc-600">
        Close readiness uses a completed Bank Cash Check (READY, zero variance) as
        reconciliation evidence when no manual worksheet is confirmed.
      </p>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading Bank Cash Check evidence…</p>
      ) : !evidence ? (
        <p className="text-sm text-zinc-500">Select a bank account to view evidence.</p>
      ) : (
        <>
          {evidence.bankAccountLabel ? (
            <p className="text-sm text-zinc-600">
              Bank account: <strong>{evidence.bankAccountLabel}</strong>
              {evidence.statementNo ? (
                <>
                  {" "}
                  · Statement <strong>{evidence.statementNo}</strong>
                  {evidence.statementStatus ? ` · ${evidence.statementStatus}` : null}
                </>
              ) : null}
            </p>
          ) : null}

          <div className={financeTableScroll}>
            <table className={financeTable}>
              <thead>
                <tr>
                  <th className={financeTh}>Statement ending</th>
                  <th className={financeTh}>Book ending</th>
                  <th className={financeTh}>Outstanding deposits</th>
                  <th className={financeTh}>Outstanding cheques</th>
                  <th className={`${financeTh} ${financeNumber}`}>Variance</th>
                  <th className={financeTh}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr data-testid="bank-cash-check-reconciliation-evidence-row">
                  <td className={financeNumber}>{evidence.statementEndingBalance}</td>
                  <td className={financeNumber}>{evidence.bookEndingBalance}</td>
                  <td className={financeNumber}>{evidence.outstandingDeposits}</td>
                  <td className={financeNumber}>{evidence.outstandingCheques}</td>
                  <td className={financeNumber}>{evidence.variance}</td>
                  <td>
                    <span
                      className={statusClassName(evidence.status)}
                      data-testid="bank-cash-check-reconciliation-status"
                    >
                      {formatBankCashCheckReconciliationStatusLabel(evidence.status)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
