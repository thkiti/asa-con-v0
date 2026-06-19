"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { FinanceDocumentAccountingSection } from "@/components/finance/FinanceDocumentAccountingSection"
import { FinanceDocumentCanonicalHeader } from "@/components/finance/FinanceDocumentCanonicalHeader"
import { FinanceDocumentPageShell } from "@/components/finance/FinanceDocumentPageShell"
import { fetchVoucherById } from "@/lib/finance-ui/fetchers"
import { formatAmount, formatDateTime } from "@/lib/finance-ui/format"
import { formatFinanceRefType } from "@/lib/finance-ui/traceability"
import type { VoucherDetail } from "@/lib/finance-ui/types"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import {
  financeMemo,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  financeThRight,
} from "@/lib/finance-ui/finance-visual-classes"
import { CopyRefButton } from "./traceability-badges"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type VoucherDetailViewProps = {
  voucherId: string
  /** Optional preloaded voucher (tests); skips client fetch when provided. */
  initialVoucher?: VoucherDetail | null
}

function VoucherLinesTable({
  title,
  lines,
  showTitle = true,
}: {
  title: string
  lines: VoucherDetail["lines"]
  showTitle?: boolean
}) {
  if (lines.length === 0) {
    return (
      <p className="mt-2 text-sm text-zinc-500">No {title.toLowerCase()} lines.</p>
    )
  }

  return (
    <div className={financeTableScroll}>
      {showTitle ? <p className="font-medium text-zinc-800">{title}</p> : null}
      <table className={showTitle ? `mt-2 ${financeTable}` : financeTable}>
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
                  data-testid={`voucher-line-account-${line.id}`}
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

function VoucherTraceMetadata({ voucher }: { voucher: VoucherDetail }) {
  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-zinc-500">Voucher date</dt>
        <dd>{formatDateTime(voucher.date)}</dd>
      </div>
      <div>
        <dt className="text-zinc-500">Branch</dt>
        <dd className="font-mono text-xs">{voucher.branchId}</dd>
      </div>
      <div>
        <dt className="text-zinc-500">Operational ref</dt>
        <dd className="flex flex-wrap items-center gap-2">
          <span>
            {formatFinanceRefType(voucher.refType)} · {voucher.refId}
          </span>
          <CopyRefButton value={voucher.refId} />
        </dd>
      </div>
      <div>
        <dt className="text-zinc-500">Voucher ID</dt>
        <dd className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {voucher.id}
          <CopyRefButton value={voucher.id} />
        </dd>
      </div>
    </dl>
  )
}

export function VoucherDetailView({
  voucherId,
  initialVoucher = null,
}: VoucherDetailViewProps) {
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
        if (!cancelled) {
          setVoucher(result.voucher)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load voucher")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [voucherId, initialVoucher])

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

  if (!voucher) {
    return <p className="text-sm text-zinc-600">Voucher not found.</p>
  }

  const isOperationalDocument = voucher.documentHeader != null

  if (isOperationalDocument) {
    return (
      <FinanceDocumentPageShell
        backHref="/finance/reconciliation"
        backLabel="← Reconciliation"
      >
        <div className="space-y-4 text-sm" data-testid="voucher-detail-view">
          <FinanceDocumentCanonicalHeader {...voucher.documentHeader!} />
          <FinanceDocumentAccountingSection
            voucherNo={voucher.voucherNo}
            refType={voucher.refType}
            postedAt={voucher.postedAt ?? voucher.journal?.postedAt ?? null}
          />
          {voucher.journal ? (
            <p>
              <Link
                href={`/finance/journal-entries/${voucher.journal.id}`}
                className={themeLinkMuted}
                data-testid="voucher-journal-link"
              >
                View posted GL journal
              </Link>
            </p>
          ) : null}
          <VoucherLinesTable title="Voucher lines" lines={voucher.lines} showTitle={false} />
          {voucher.journal ? (
            <section className="border-t border-zinc-200 pt-4">
              <p className="font-medium text-zinc-800">Journal entry</p>
              <p className="mt-1 text-zinc-600">
                Posted {formatDateTime(voucher.journal.postedAt)} ·{" "}
                <span className="font-mono text-xs">{voucher.journal.id}</span>
              </p>
              <VoucherLinesTable title="Journal lines" lines={voucher.journal.lines} />
            </section>
          ) : (
            <p className="text-zinc-500">No posted journal entry.</p>
          )}
          <section
            className="border-t border-zinc-200 pt-4"
            data-testid="voucher-detail-technical-metadata"
          >
            <h3 className="text-sm font-medium text-zinc-800">Technical details</h3>
            <div className="mt-2">
              <VoucherTraceMetadata voucher={voucher} />
            </div>
          </section>
        </div>
      </FinanceDocumentPageShell>
    )
  }

  return (
    <>
      <Link href="/finance/reconciliation" className={`text-sm ${themeLinkMuted}`}>
        ← Reconciliation
      </Link>
      <h1 className="mt-4 text-xl font-semibold" data-testid="voucher-trace-dashboard-title">
        Voucher trace
      </h1>
      <p className="mt-2 text-zinc-600">
        Read-only voucher and journal lines for finance audit investigation.
      </p>
      <div
        className="mt-6 space-y-4 rounded border border-zinc-200 bg-white p-4 text-sm"
        data-testid="voucher-detail-view"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Finance trace view</h2>
            <p className="mt-1 text-zinc-600">
              {formatFinanceRefType(voucher.refType)} · {voucher.refId}
            </p>
          </div>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-800">
            {voucher.status}
          </span>
        </div>
        <FinanceDocumentAccountingSection
          voucherNo={voucher.voucherNo}
          refType={voucher.refType}
          postedAt={voucher.postedAt ?? voucher.journal?.postedAt ?? null}
        />
        <VoucherTraceMetadata voucher={voucher} />
        {voucher.journal ? (
          <p>
            <Link
              href={`/finance/journal-entries/${voucher.journal.id}`}
              className={themeLinkMuted}
              data-testid="voucher-journal-link"
            >
              View posted GL journal
            </Link>
          </p>
        ) : null}
        <VoucherLinesTable title="Voucher lines" lines={voucher.lines} />
        {voucher.journal ? (
          <div className="border-t border-zinc-100 pt-4">
            <p className="font-medium text-zinc-800">Journal entry</p>
            <p className="mt-1 text-zinc-600">
              Posted {formatDateTime(voucher.journal.postedAt)} ·{" "}
              <span className="font-mono text-xs">{voucher.journal.id}</span>
            </p>
            <VoucherLinesTable title="Journal lines" lines={voucher.journal.lines} />
          </div>
        ) : (
          <p className="text-zinc-500">No posted journal entry.</p>
        )}
      </div>
    </>
  )
}
