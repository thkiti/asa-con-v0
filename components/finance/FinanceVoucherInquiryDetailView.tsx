"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { FinanceAdminPageShell } from "@/components/finance/FinanceAdminPageShell"
import { fetchVoucherById } from "@/lib/finance-ui/fetchers"
import { formatAmount, formatDateTime } from "@/lib/finance-ui/format"
import { formatEntityContextTitle } from "@/lib/legal-entity"
import { financeAdminPageTitleClass } from "@/lib/main-ui/finance-page-layout"
import {
  buildFinanceJournalInquiryPath,
  resolveFinanceDocumentBackLink,
} from "@/lib/finance-ui/finance-navigation"
import {
  formatVoucherInquiryRefTypeLabel,
  formatVoucherInquirySourceLabel,
} from "@/lib/finance/inquiry/voucher-inquiry-labels"
import type { VoucherDetail, VoucherLineDetail } from "@/lib/finance-ui/types"
import {
  financeMemo,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  financeThRight,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type FinanceVoucherInquiryDetailViewProps = {
  voucherId: string
  initialVoucher?: VoucherDetail | null
  returnTo?: string | null
}

type LineTotals = {
  totalDebit: number
  totalCredit: number
  balanced: boolean
}

function sumLineTotals(lines: VoucherLineDetail[]): LineTotals {
  let totalDebit = 0
  let totalCredit = 0
  for (const line of lines) {
    totalDebit += Number(line.debit) || 0
    totalCredit += Number(line.credit) || 0
  }
  return {
    totalDebit,
    totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 0.005,
  }
}

function JournalLinesTable({
  lines,
  testId,
}: {
  lines: VoucherLineDetail[]
  testId: string
}) {
  const totals = sumLineTotals(lines)

  return (
    <div className={financeTableScroll} data-testid={testId}>
      <table className={financeTable}>
        <thead>
          <tr>
            <th className={financeTh}>Account Code</th>
            <th className={financeTh}>Account Name</th>
            <th className={financeTh}>Memo</th>
            <th className={financeThRight}>Debit</th>
            <th className={financeThRight}>Credit</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id}>
              <td className="font-mono text-xs">{line.accountCode}</td>
              <td>{line.accountName}</td>
              <td className={financeMemo}>{line.memo ?? "—"}</td>
              <td className={financeNumber}>{formatAmount(line.debit)}</td>
              <td className={financeNumber}>{formatAmount(line.credit)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-300 font-semibold">
            <td colSpan={3} className="py-2 text-right">
              Total
            </td>
            <td className={financeNumber}>{formatAmount(String(totals.totalDebit))}</td>
            <td className={financeNumber}>{formatAmount(String(totals.totalCredit))}</td>
          </tr>
          <tr>
            <td colSpan={5} className="py-1 text-right text-sm">
              {totals.balanced ? (
                <span
                  className="font-medium text-emerald-700"
                  data-testid="voucher-inquiry-balanced"
                >
                  Balanced
                </span>
              ) : (
                <span
                  className="font-medium text-amber-800"
                  data-testid="voucher-inquiry-unbalanced"
                >
                  Difference:{" "}
                  {formatAmount(String(Math.abs(totals.totalDebit - totals.totalCredit)))}
                </span>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export function FinanceVoucherInquiryDetailView({
  voucherId,
  initialVoucher = null,
  returnTo = null,
}: FinanceVoucherInquiryDetailViewProps) {
  const [voucher, setVoucher] = useState<VoucherDetail | null>(initialVoucher)
  const [loading, setLoading] = useState(initialVoucher == null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialVoucher != null) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchVoucherById(voucherId)
        if (!cancelled) setVoucher(result.voucher)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load voucher")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [voucherId, initialVoucher])

  const backLink = useMemo(() => {
    if (!voucher) return null
    return resolveFinanceDocumentBackLink({
      returnTo,
      refType: voucher.refType,
      refId: voucher.refId,
      documentNo: voucher.refNo,
      moduleDefaultHref: "/finance/vouchers",
      moduleDefaultLabel: "← Voucher / Journal Inquiry",
    })
  }, [voucher, returnTo])

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading voucher…</p>
  }

  if (error) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {error}
      </p>
    )
  }

  if (!voucher || !backLink) {
    return <p className="text-sm text-zinc-600">Voucher not found.</p>
  }

  const sourceLabel = formatVoucherInquirySourceLabel(voucher.refType)
  const journalLines = voucher.journal?.lines ?? []

  return (
    <FinanceAdminPageShell
      backHref={backLink.href}
      backLabel={backLink.label}
      heading={
        <h1 className={financeAdminPageTitleClass} data-testid="entity-context-page-title">
          {formatEntityContextTitle(
            voucher.legalEntityCode as "AS" | "AD",
            voucher.voucherNo
          )}
        </h1>
      }
      intro="Read-only voucher and journal inquiry."
    >
      <div className="space-y-6 text-sm" data-testid="voucher-inquiry-detail">
        <section
          className="rounded border border-zinc-200 bg-white p-4"
          data-testid="voucher-inquiry-header"
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Voucher No</dt>
              <dd className="font-mono">{voucher.voucherNo}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Entity</dt>
              <dd>{voucher.legalEntityCode}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Period</dt>
              <dd>{voucher.periodKey}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Entry date</dt>
              <dd>{formatDateTime(voucher.date).slice(0, 10)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Ref type</dt>
              <dd>{formatVoucherInquiryRefTypeLabel(voucher.refType)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Ref No</dt>
              <dd className={financeMemo}>{voucher.refNo ?? "—"}</dd>
            </div>
            {sourceLabel ? (
              <div>
                <dt className="text-zinc-500">Source</dt>
                <dd>{sourceLabel}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-zinc-500">Status</dt>
              <dd>{voucher.status}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Description</dt>
              <dd>{voucher.description ?? "—"}</dd>
            </div>
            {voucher.postedAt ? (
              <div>
                <dt className="text-zinc-500">Posted</dt>
                <dd>{formatDateTime(voucher.postedAt)}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {voucher.journal ? (
          <section data-testid="voucher-inquiry-journal">
            <h2 className="text-base font-semibold text-zinc-900">Journal entry</h2>
            <p className="mt-1 text-zinc-600">
              Posted {formatDateTime(voucher.journal.postedAt)} ·{" "}
              <Link
                href={buildFinanceJournalInquiryPath(voucher.journal.id, returnTo)}
                className={`font-mono text-xs ${themeLinkMuted}`}
                data-testid="voucher-inquiry-journal-link"
              >
                {voucher.journal.id}
              </Link>
            </p>
            <p className="mt-1 text-zinc-600">
              Source ref: {formatVoucherInquiryRefTypeLabel(voucher.refType)}
              {voucher.refNo ? ` · ${voucher.refNo}` : null}
            </p>
            <div className="mt-3">
              <JournalLinesTable
                lines={journalLines}
                testId="voucher-inquiry-journal-lines"
              />
            </div>
          </section>
        ) : (
          <p
            className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-600"
            data-testid="voucher-inquiry-no-journal"
          >
            No journal entry linked.
          </p>
        )}
      </div>
    </FinanceAdminPageShell>
  )
}
