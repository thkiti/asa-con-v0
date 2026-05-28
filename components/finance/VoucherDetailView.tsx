"use client"

import { useEffect, useState } from "react"
import { fetchVoucherById } from "@/lib/finance-ui/fetchers"
import { formatAmount, formatDateTime } from "@/lib/finance-ui/format"
import { formatFinanceRefType } from "@/lib/finance-ui/traceability"
import type { VoucherDetail } from "@/lib/finance-ui/types"
import { CopyRefButton } from "./traceability-badges"

type VoucherDetailViewProps = {
  voucherId: string
}

function VoucherLinesTable({
  title,
  lines,
}: {
  title: string
  lines: VoucherDetail["lines"]
}) {
  if (lines.length === 0) {
    return (
      <p className="mt-2 text-sm text-zinc-500">No {title.toLowerCase()} lines.</p>
    )
  }

  return (
    <div className="mt-3 overflow-x-auto">
      <p className="font-medium text-zinc-800">{title}</p>
      <table className="mt-2 min-w-full text-sm">
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
          {lines.map((line) => (
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
  )
}

export function VoucherDetailView({ voucherId }: VoucherDetailViewProps) {
  const [voucher, setVoucher] = useState<VoucherDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
  }, [voucherId])

  if (loading) {
    return <p className="mt-4 text-sm text-zinc-600">Loading voucher…</p>
  }

  if (error) {
    return (
      <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {error}
      </p>
    )
  }

  if (!voucher) {
    return (
      <p className="mt-4 text-sm text-zinc-600">Voucher not found.</p>
    )
  }

  return (
    <div className="mt-6 rounded border border-zinc-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Voucher {voucher.voucherNo}
          </h2>
          <p className="mt-1 text-zinc-600">Read-only finance trace view.</p>
        </div>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-800">
          {voucher.status}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Voucher date</dt>
          <dd>{formatDateTime(voucher.date)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Posted</dt>
          <dd>{voucher.postedAt ? formatDateTime(voucher.postedAt) : "—"}</dd>
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
          <dt className="text-zinc-500">Document ref</dt>
          <dd>{voucher.refNo ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Branch</dt>
          <dd className="font-mono text-xs">{voucher.branchId}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Voucher ID</dt>
          <dd className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {voucher.id}
            <CopyRefButton value={voucher.id} />
          </dd>
        </div>
      </dl>

      {voucher.description ? (
        <p className="mt-4 text-zinc-700">{voucher.description}</p>
      ) : null}

      <VoucherLinesTable title="Voucher lines" lines={voucher.lines} />

      {voucher.journal ? (
        <div className="mt-6 border-t border-zinc-100 pt-4">
          <p className="font-medium text-zinc-800">Journal entry</p>
          <p className="mt-1 text-zinc-600">
            Posted {formatDateTime(voucher.journal.postedAt)} ·{" "}
            <span className="font-mono text-xs">{voucher.journal.id}</span>
          </p>
          <VoucherLinesTable title="Journal lines" lines={voucher.journal.lines} />
        </div>
      ) : (
        <p className="mt-6 text-zinc-500">No posted journal entry.</p>
      )}
    </div>
  )
}
