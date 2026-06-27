"use client"

import type { RefundPreviewResult } from "@/lib/pos/refund"
import { REFUND_REASONS } from "@/lib/pos/refund-reasons"
import type { RefundableReceiptSummary } from "@/lib/pos/search-refundable-receipts"
import { formatRecentSaleReceiptOption } from "@/lib/pos-ui/pos-refund-client"

type PosRefundOverlayProps = {
  receiptNo: string
  receipts: RefundableReceiptSummary[]
  receiptsLoading: boolean
  onReceiptSelect: (receiptNo: string) => void
  amount: string
  onAmountChange: (value: string) => void
  reasonCode: string
  onReasonCodeChange: (value: string) => void
  preview: RefundPreviewResult | null
  lookupPending: boolean
  pending: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

const PREVIEW_PANEL_HEIGHT = "h-44"

function formatMoney(value: string): string {
  const n = Number(value)
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function ReceiptPreviewPlaceholder({
  receiptsLoading,
  noEligibleReceipts,
  lookupPending,
  receiptSelected,
}: {
  receiptsLoading: boolean
  noEligibleReceipts: boolean
  lookupPending: boolean
  receiptSelected: boolean
}) {
  if (lookupPending) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-white/80">
        Loading sale details…
      </p>
    )
  }

  if (receiptsLoading) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-white/70">
        Loading sales…
      </p>
    )
  }

  if (noEligibleReceipts) {
    return (
      <p className="flex h-full items-center justify-center px-2 text-center text-sm text-white/90">
        ไม่พบใบเสร็จในช่วง 2 เดือนล่าสุด
        <br />
        ไม่สามารถดำเนินการคืนเงินได้
      </p>
    )
  }

  if (receiptSelected) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-white/70">
        Loading sale details…
      </p>
    )
  }

  return (
    <p className="flex h-full items-center justify-center text-sm text-white/60">
      Select a receipt to preview sale items
    </p>
  )
}

export function PosRefundOverlay({
  receiptNo,
  receipts,
  receiptsLoading,
  onReceiptSelect,
  amount,
  onAmountChange,
  reasonCode,
  onReasonCodeChange,
  preview,
  lookupPending,
  pending,
  error,
  onConfirm,
  onClose,
}: PosRefundOverlayProps) {
  const noEligibleReceipts =
    !receiptsLoading && receipts.length === 0 && !lookupPending
  const receiptSelected = receiptNo.trim().length > 0
  const showPreviewContent = preview != null && !lookupPending

  const canConfirm =
    preview != null &&
    reasonCode.trim().length > 0 &&
    !pending &&
    !lookupPending &&
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
        className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/80 bg-white/20 text-lg font-bold leading-none shadow hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        ×
      </button>

      <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-12">
        <h2
          id="pos-refund-title"
          className="mb-4 shrink-0 text-center text-xl font-bold tracking-wide"
        >
          Refund
        </h2>

        <div className="mx-auto flex w-full max-w-sm min-h-0 flex-1 flex-col gap-3">
            <label className="flex shrink-0 flex-col gap-1 text-left text-xs font-semibold uppercase tracking-wide text-white/90">
              Recent Sales
              <select
                value={receiptNo}
                onChange={(e) => onReceiptSelect(e.target.value)}
                disabled={pending || lookupPending || receiptsLoading}
                className="rounded border border-white/40 bg-white/95 px-3 py-2 font-mono text-sm normal-case text-zinc-900 cursor-pointer"
                aria-label="Recent sales"
              >
                <option value="">
                  {receiptsLoading ? "Loading sales…" : "Select receipt…"}
                </option>
                {receipts.map((row) => (
                  <option key={row.saleId} value={row.receiptNo}>
                    {formatRecentSaleReceiptOption(row)}
                  </option>
                ))}
              </select>
            </label>

            <section className="flex shrink-0 flex-col gap-1" aria-label="Receipt preview">
              <div className="border-t border-white/40" />
              <p className="text-left text-xs font-semibold uppercase tracking-wide text-white/90">
                Receipt Preview
              </p>
              <div className="border-t border-white/40" />

              <div
                className={`${PREVIEW_PANEL_HEIGHT} shrink-0 overflow-hidden rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-left text-sm`}
              >
                {showPreviewContent ? (
                  <div className="flex h-full min-h-0 flex-col">
                    <div
                      className="min-h-0 flex-1 overflow-y-auto pr-3"
                      aria-label="Sale items"
                    >
                      <div className="mb-1 grid grid-cols-[1.5rem_1fr_2.5rem_4.5rem] gap-1 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                        <div>#</div>
                        <div>Name</div>
                        <div className="text-center">Qty</div>
                        <div className="text-right">Amount</div>
                      </div>
                      {preview.items.map((item, index) => (
                        <div
                          key={`${item.name}-${index}`}
                          className="grid grid-cols-[1.5rem_1fr_2.5rem_4.5rem] gap-1 py-0.5 text-xs leading-snug"
                        >
                          <div className="tabular-nums text-white/80">{index + 1}</div>
                          <div className="min-w-0 truncate font-medium">{item.name}</div>
                          <div className="text-center tabular-nums">{item.qty}</div>
                          <div className="text-right font-mono tabular-nums">
                            {formatMoney(item.lineTotal)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 shrink-0 space-y-0.5 border-t border-white/20 pt-1 text-xs tabular-nums">
                      <p>Sale total: {formatMoney(preview.saleTotal)}</p>
                      <p>Already refunded: {formatMoney(preview.refundedTotal)}</p>
                      <p className="font-bold">
                        Remaining: {formatMoney(preview.remainingRefundable)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <ReceiptPreviewPlaceholder
                    receiptsLoading={receiptsLoading}
                    noEligibleReceipts={noEligibleReceipts}
                    lookupPending={lookupPending}
                    receiptSelected={receiptSelected}
                  />
                )}
              </div>

              <div className="border-t border-white/40" />
            </section>

            <label className="flex shrink-0 flex-col gap-1 text-left text-xs font-semibold uppercase tracking-wide text-white/90">
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

            <label className="flex shrink-0 flex-col gap-1 text-left text-xs font-semibold uppercase tracking-wide text-white/90">
              Refund reason
              <select
                value={reasonCode}
                onChange={(e) => onReasonCodeChange(e.target.value)}
                disabled={!preview || pending || lookupPending}
                className="rounded border border-white/40 bg-white/95 px-3 py-2 text-sm normal-case text-zinc-900 cursor-pointer"
                aria-label="Refund reason"
              >
                <option value="">Select reason…</option>
                {REFUND_REASONS.map((row) => (
                  <option key={row.code} value={row.code}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>

            <p
              className="min-h-5 shrink-0 text-center text-sm font-medium text-red-100"
              role="alert"
              aria-live="polite"
            >
              {error ?? "\u00a0"}
            </p>

            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm}
              className="shrink-0 rounded-lg border-2 border-white bg-white px-8 py-3 text-base font-bold text-orange-700 shadow hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {pending ? "Loading…" : "Preview refund ticket"}
            </button>
        </div>
      </div>
    </div>
  )
}
