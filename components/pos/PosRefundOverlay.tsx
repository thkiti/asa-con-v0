"use client"

import type { RefundPreviewResult } from "@/lib/pos/refund"

type PosRefundOverlayProps = {
  receiptNo: string
  onReceiptNoChange: (value: string) => void
  amount: string
  onAmountChange: (value: string) => void
  reason: string
  onReasonChange: (value: string) => void
  preview: RefundPreviewResult | null
  lookupPending: boolean
  pending: boolean
  error: string | null
  success: { refundNo: string; amount: string } | null
  onLookup: () => void
  onConfirm: () => void
  onClose: () => void
}

function formatMoney(value: string): string {
  const n = Number(value)
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function PosRefundOverlay({
  receiptNo,
  onReceiptNoChange,
  amount,
  onAmountChange,
  reason,
  onReasonChange,
  preview,
  lookupPending,
  pending,
  error,
  success,
  onLookup,
  onConfirm,
  onClose,
}: PosRefundOverlayProps) {
  const canLookup = receiptNo.trim().length > 0 && !lookupPending && !pending && !success
  const canConfirm =
    preview != null &&
    !pending &&
    !lookupPending &&
    !success &&
    Number(preview.remainingRefundable) > 0

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-orange-600/98 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-refund-title"
    >
      <button
        type="button"
        aria-label="Close refund"
        onClick={onClose}
        disabled={pending || lookupPending}
        className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/80 bg-white/20 text-lg font-bold leading-none shadow hover:bg-white/30 disabled:opacity-50"
      >
        ×
      </button>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-6 py-12 text-center">
        <h2 id="pos-refund-title" className="text-xl font-bold tracking-wide">
          {success ? "Refund complete" : "Refund"}
        </h2>

        {success ? (
          <>
            <p className="text-sm text-white/90">Refund receipt</p>
            <p className="font-mono text-lg font-bold tabular-nums">{success.refundNo}</p>
            <p className="text-2xl font-bold tabular-nums">{formatMoney(success.amount)}</p>
            <p className="max-w-xs text-sm text-white/90">
              Refund receipt opened for printing.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-lg border-2 border-white bg-white px-8 py-3 text-sm font-bold text-orange-700 shadow hover:bg-orange-50"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <p className="max-w-xs text-sm text-white/90">
              Enter the original sale receipt number to refund.
            </p>

            <label className="flex w-full max-w-sm flex-col gap-1 text-left text-xs font-semibold uppercase tracking-wide text-white/90">
              Original receipt
              <input
                type="text"
                value={receiptNo}
                onChange={(e) => onReceiptNoChange(e.target.value)}
                disabled={pending || lookupPending}
                placeholder="REC-SH001-202606-0001"
                className="rounded border border-white/40 bg-white/95 px-3 py-2 font-mono text-sm normal-case text-zinc-900"
                aria-label="Original receipt number"
              />
            </label>

            <button
              type="button"
              onClick={onLookup}
              disabled={!canLookup}
              className="rounded-lg border-2 border-white/80 bg-white/15 px-6 py-2 text-sm font-bold shadow hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {lookupPending ? "Looking up…" : "Look up receipt"}
            </button>

            {preview ? (
              <div className="w-full max-w-sm rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-left text-sm">
                <p className="font-mono text-xs text-white/80">{preview.originalReceiptNo}</p>
                <p className="mt-2 tabular-nums">
                  Sale total: {formatMoney(preview.saleTotal)}
                </p>
                <p className="tabular-nums">
                  Already refunded: {formatMoney(preview.refundedTotal)}
                </p>
                <p className="font-bold tabular-nums">
                  Remaining: {formatMoney(preview.remainingRefundable)}
                </p>
              </div>
            ) : null}

            <label className="flex w-full max-w-sm flex-col gap-1 text-left text-xs font-semibold uppercase tracking-wide text-white/90">
              Refund amount
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                disabled={!preview || pending || lookupPending}
                className="rounded border border-white/40 bg-white/95 px-3 py-2 font-mono text-sm normal-case text-zinc-900"
                aria-label="Refund amount"
              />
            </label>

            <label className="flex w-full max-w-sm flex-col gap-1 text-left text-xs font-semibold uppercase tracking-wide text-white/90">
              Reason (optional)
              <input
                type="text"
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                disabled={!preview || pending || lookupPending}
                className="rounded border border-white/40 bg-white/95 px-3 py-2 text-sm normal-case text-zinc-900"
                aria-label="Refund reason"
              />
            </label>

            {error ? (
              <p className="max-w-xs text-sm font-medium text-red-100" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm}
              className="mt-1 rounded-lg border-2 border-white bg-white px-8 py-3 text-base font-bold text-orange-700 shadow hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Processing…" : "Process refund"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
