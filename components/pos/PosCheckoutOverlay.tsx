"use client"

import { cartTotal } from "@/lib/pos/cart"
import type { PosCartLine } from "@/lib/pos/cart"
import {
  POS_CHECKOUT_PAYMENT_DEFAULT,
  POS_CHECKOUT_PAYMENT_OPTIONS,
  posCheckoutConfirmLabel,
  posCheckoutReceiptLabel,
  type PosCheckoutPaymentMethod,
} from "@/lib/pos-ui/pos-payment-methods"
import { useState } from "react"

type PosCheckoutOverlayProps = {
  lines: readonly PosCartLine[]
  pending: boolean
  error: string | null
  success: {
    saleId: string
    receiptNo: string
    total: string
    paymentMethod: PosCheckoutPaymentMethod
  } | null
  onConfirm: (paymentMethod: PosCheckoutPaymentMethod) => void
  onPrintReceiptAndNewSale: (saleId: string) => void
  onNewSaleWithoutPrint: () => void
  onClose: () => void
}

function formatMoney(value: string): string {
  const n = Number(value)
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function PosCheckoutOverlay({
  lines,
  pending,
  error,
  success,
  onConfirm,
  onPrintReceiptAndNewSale,
  onNewSaleWithoutPrint,
  onClose,
}: PosCheckoutOverlayProps) {
  const total = cartTotal(lines)
  const [paymentMethod, setPaymentMethod] = useState<PosCheckoutPaymentMethod>(
    POS_CHECKOUT_PAYMENT_DEFAULT
  )
  const confirmLabel = posCheckoutConfirmLabel(paymentMethod)

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-orange-600/98 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-checkout-title"
    >
      <button
        type="button"
        aria-label="Close checkout"
        onClick={onClose}
        disabled={pending}
        className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/80 bg-white/20 text-lg font-bold leading-none shadow hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        ×
      </button>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <h2 id="pos-checkout-title" className="text-xl font-bold tracking-wide">
          {success ? "Sale complete" : "Checkout"}
        </h2>

        {success ? (
          <>
            <p className="text-sm text-white/90">
              Receipt ({posCheckoutReceiptLabel(success.paymentMethod)})
            </p>
            <p className="font-mono text-lg font-bold tabular-nums">{success.receiptNo}</p>
            <p className="text-2xl font-bold tabular-nums">{formatMoney(success.total)}</p>
            <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
              <button
                type="button"
                onClick={() => onPrintReceiptAndNewSale(success.saleId)}
                className="rounded-lg border-2 border-white bg-white px-6 py-3 text-sm font-bold text-orange-700 shadow hover:bg-orange-50 cursor-pointer"
              >
                Print Receipt &amp; New Sale
              </button>
              <button
                type="button"
                onClick={onNewSaleWithoutPrint}
                className="rounded-lg border-2 border-white/80 bg-transparent px-6 py-2 text-sm font-bold text-white shadow hover:bg-white/10 cursor-pointer"
              >
                New Sale without print
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-white/90">
              {lines.length} line{lines.length === 1 ? "" : "s"}
            </p>
            <p className="text-3xl font-bold tabular-nums">{formatMoney(total)}</p>
            <p className="w-full max-w-xs text-left text-xs font-bold text-white/90">
              Payment method
            </p>
            <div
              className="grid w-full max-w-xs grid-cols-1 gap-2"
              role="group"
              aria-label="Payment method"
            >
              {POS_CHECKOUT_PAYMENT_OPTIONS.map((option) => {
                const selected = paymentMethod === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={pending}
                    aria-pressed={selected}
                    onClick={() => setPaymentMethod(option.value)}
                    className={`rounded-lg border-2 px-4 py-3 text-sm font-bold shadow disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
                      selected
                        ? "border-white bg-white text-orange-700"
                        : "border-white/70 bg-white/15 text-white hover:bg-white/25"
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
            {error ? (
              <p className="max-w-xs text-sm font-medium text-red-100" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => onConfirm(paymentMethod)}
              disabled={pending || lines.length === 0}
              className="mt-2 rounded-lg border-2 border-white bg-white px-8 py-3 text-base font-bold text-orange-700 shadow hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {pending ? "Processing…" : confirmLabel}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
