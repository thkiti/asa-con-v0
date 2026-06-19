"use client"

import Link from "next/link"
import { useState } from "react"
import {
  buildVoucherDetailPath,
  formatJournalLinkLabel,
  formatOperationalSourceKind,
  formatOperationalSourceLabel,
  formatVoucherLinkLabel,
  formatVoucherRefSummary,
} from "@/lib/finance-ui/trace-links"
import { useFinanceCurrentReturnPath } from "@/lib/finance-ui/use-finance-current-return-path"
import type {
  ReconciliationIssueJournalRef,
  ReconciliationIssueRow,
  ReconciliationIssueVoucherRef,
} from "@/lib/finance-ui/types"

export function CopyRefButton({
  value,
  label = "Copy ID",
}: {
  value: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-50"
    >
      {copied ? "Copied" : label}
    </button>
  )
}

export function OperationalSourceChip({
  row,
}: {
  row: Pick<
    ReconciliationIssueRow,
    "sourceType" | "sourceId" | "documentRef"
  >
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-800">
        {formatOperationalSourceKind(row.sourceType)}
      </span>
      <span className="font-mono text-xs text-zinc-700">
        {formatOperationalSourceLabel(row)}
      </span>
      <CopyRefButton value={row.sourceId} />
    </span>
  )
}

export function VoucherTraceLink({
  voucher,
}: {
  voucher: ReconciliationIssueVoucherRef
}) {
  const returnTo = useFinanceCurrentReturnPath()

  return (
    <Link
      href={buildVoucherDetailPath(voucher.id, returnTo)}
      className="inline-flex flex-wrap items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-100"
    >
      <span className="font-medium">Voucher {formatVoucherLinkLabel(voucher)}</span>
      <span className="font-mono text-zinc-600">
        {formatVoucherRefSummary(voucher)}
      </span>
    </Link>
  )
}

export function JournalTraceRef({
  journal,
  voucherNo,
}: {
  journal: ReconciliationIssueJournalRef
  voucherNo?: string
}) {
  const returnTo = useFinanceCurrentReturnPath()

  return (
    <Link
      href={buildVoucherDetailPath(journal.voucherId, returnTo)}
      className="inline-flex flex-wrap items-center gap-2 rounded border border-zinc-200 bg-white px-2 py-1 font-mono text-xs text-zinc-800 hover:bg-zinc-50"
    >
      <span>{formatJournalLinkLabel(journal, voucherNo)}</span>
      <span className="text-zinc-500">· {journal.id}</span>
    </Link>
  )
}
