"use client"

import { PosRefundTicketSlip } from "@/components/pos/PosRefundTicketSlip"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"

type PosRefundTicketPanelProps = {
  receipt: RefundReceiptPrintContext
  pending: boolean
  error: string | null
  onPrintRefund: () => void
  onClose: () => void
}

/**
 * REFUND ticket — on-screen thermal slip is the same DOM used for print clone.
 */
export function PosRefundTicketPanel({
  receipt,
  pending,
  error,
  onPrintRefund,
  onClose,
}: PosRefundTicketPanelProps) {
  return (
    <div
      className="absolute inset-0 z-[46] flex min-h-0 flex-col bg-orange-600/98 text-white"
      data-testid="pos-refund-ticket-panel"
    >
      <button
        type="button"
        aria-label="Close refund ticket"
        onClick={onClose}
        disabled={pending}
        data-testid="pos-refund-ticket-close"
        className="absolute right-2 top-2 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white/80 bg-white/20 text-lg font-bold leading-none shadow hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        ×
      </button>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-2 pb-2 pt-10">
        <p className="shrink-0 text-center text-sm font-bold tracking-wide">
          REFUND — ใบคืนเงิน
        </p>
        <p className="shrink-0 text-center text-[11px] text-white/85">
          ใบเสร็จเดิม {receipt.originalReceiptNo ?? "—"}
        </p>

        <div
          className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden"
          data-testid="pos-refund-ticket-preview"
        >
          <div className="receipt-setup-preview !mt-0 !p-0" data-testid="refund-print-preview">
            <div className="relative w-full max-w-full">
              <PosRefundTicketSlip receipt={receipt} framed />
            </div>
          </div>
        </div>

        <p
          className="min-h-4 shrink-0 text-center text-sm font-medium text-red-100"
          role="alert"
          aria-live="polite"
        >
          {error ?? "\u00a0"}
        </p>

        <button
          type="button"
          onClick={onPrintRefund}
          disabled={pending}
          data-testid="pos-refund-print-button"
          className="shrink-0 rounded-lg border-2 border-white bg-white px-6 py-2.5 text-base font-bold text-orange-700 shadow hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {pending ? "Processing…" : "PRINT REFUND"}
        </button>

        <p className="shrink-0 text-center text-[10px] text-white/80">
          กด PRINT REFUND เพื่อบันทึกและพิมพ์ตั๋ว
        </p>
      </div>
    </div>
  )
}
