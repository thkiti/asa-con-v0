"use client"

import type { ReceiptLookupRow } from "@/lib/pos/receipt-lookup-types"
import {
  openReceiptArchivePdf,
  printReceiptArchivePdf,
} from "@/lib/pos-ui/receipt-lookup-client"

type ReceiptLookupResultProps = {
  receipt: ReceiptLookupRow | null
  branchId: string
  notFound?: boolean
  notFoundRunningNo?: string | null
  variant?: "page" | "panel"
}

function formatIssuedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function formatMoney(value: string): string {
  const n = Number(value)
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function ResultField({
  label,
  value,
  compact,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-2 border-b border-white/25 ${compact ? "py-1.5" : "py-2.5"}`}
    >
      <span
        className={`font-semibold text-white/85 ${compact ? "text-xs" : "text-sm"}`}
      >
        {label}
      </span>
      <span
        className={`text-right font-bold tabular-nums ${compact ? "text-xs" : "text-base"} ${label === "Receipt" ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  )
}

const FUTURE_ACTIONS = [
  "Email",
  "Download",
  "Attachments",
  "Audit History",
] as const

export function ReceiptLookupResult({
  receipt,
  branchId,
  notFound = false,
  notFoundRunningNo,
  variant = "page",
}: ReceiptLookupResultProps) {
  const compact = variant === "panel"

  if (notFound) {
    const message = notFoundRunningNo
      ? `Receipt not found: ${notFoundRunningNo}`
      : "Receipt not found."
    return (
      <p
        className="text-center text-sm font-medium text-white/90"
        data-testid="receipt-lookup-empty"
      >
        {message}
      </p>
    )
  }

  if (!receipt) return null

  const pdfReady = receipt.archiveStatus === "ready" && Boolean(receipt.pdfUrl)

  return (
    <div
      className={`w-full space-y-3 ${compact ? "" : "max-w-md space-y-4"}`}
      data-testid="receipt-lookup-result"
    >
      <div
        className={`rounded-lg border-2 border-white/60 bg-white/10 text-left ${compact ? "px-3 py-2" : "px-4 py-3"}`}
        data-testid="receipt-lookup-result-card"
      >
        <ResultField compact={compact} label="Receipt" value={receipt.receiptNo} />
        <ResultField
          compact={compact}
          label="Date / Time"
          value={formatIssuedAt(receipt.issuedAt)}
        />
        <ResultField
          compact={compact}
          label="Staff"
          value={receipt.staffDisplay ?? "—"}
        />
        <ResultField
          compact={compact}
          label="Payment"
          value={receipt.paymentMethodLabel}
        />
        <ResultField compact={compact} label="Total" value={formatMoney(receipt.total)} />
        <div
          className={`flex items-baseline justify-between gap-2 ${compact ? "py-1.5" : "py-2.5"}`}
          data-testid="receipt-lookup-archive-status"
          data-archive-status={receipt.archiveStatus}
          title={receipt.archiveError}
        >
          <span
            className={`font-semibold text-white/85 ${compact ? "text-xs" : "text-sm"}`}
          >
            Archive Status
          </span>
          <span className={`text-right font-bold ${compact ? "text-xs" : "text-base"}`}>
            {receipt.archiveStatusLabel}
          </span>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        {pdfReady ? (
          <>
            <button
              type="button"
              data-testid="receipt-lookup-view-pdf"
              onClick={() => openReceiptArchivePdf(receipt.receiptId, branchId)}
              className={`rounded-lg border-2 border-white bg-white font-bold text-orange-700 shadow hover:bg-orange-50 cursor-pointer ${compact ? "px-4 py-2 text-sm" : "px-8 py-3 text-base"}`}
            >
              View PDF
            </button>
            <button
              type="button"
              data-testid="receipt-lookup-print-pdf"
              onClick={() => printReceiptArchivePdf(receipt.receiptId, branchId)}
              className={`rounded-lg border-2 border-white/80 bg-transparent font-bold text-white shadow hover:bg-white/10 cursor-pointer ${compact ? "px-4 py-2 text-sm" : "px-8 py-3 text-base"}`}
            >
              Print PDF
            </button>
          </>
        ) : compact ? null : (
          <p className="text-center text-sm text-white/80">
            PDF actions available when archive is ready.
          </p>
        )}
      </div>

      <div
        className={`border-t border-white/30 ${compact ? "pt-3" : "pt-4"}`}
        data-testid="receipt-lookup-future-actions"
      >
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-white/60">
          Coming soon
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {FUTURE_ACTIONS.map((label) => (
            <button
              key={label}
              type="button"
              disabled
              aria-disabled
              className="rounded border border-white/30 bg-white/5 px-2 py-1.5 text-[10px] font-bold text-white/45 cursor-not-allowed"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
