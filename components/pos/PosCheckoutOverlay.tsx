"use client"

import { cartTotal } from "@/lib/pos/cart"
import type { PosCartLine } from "@/lib/pos/cart"
import {
  captureVideoFrame,
  startCheckoutCameraStream,
  stopMediaStream,
} from "@/lib/pos-ui/capture-video-frame"
import {
  POS_CHECKOUT_PAYMENT_DEFAULT,
  POS_CHECKOUT_PAYMENT_OPTIONS,
  posCheckoutConfirmLabel,
  posCheckoutReceiptLabel,
  type PosCheckoutPaymentMethod,
} from "@/lib/pos-ui/pos-payment-methods"
import { useEffect, useRef, useState } from "react"

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
  onBankTransferCapture: (blob: Blob) => void
  onPrintReceiptAndNewSale: (saleId: string) => void
  onNewSaleWithoutPrint: () => void
  onClose: () => void
}

type CheckoutView = "select" | "bank_capture" | "success"

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
  onBankTransferCapture,
  onPrintReceiptAndNewSale,
  onNewSaleWithoutPrint,
  onClose,
}: PosCheckoutOverlayProps) {
  const total = cartTotal(lines)
  const [view, setView] = useState<CheckoutView>(success ? "success" : "select")
  const [paymentMethod, setPaymentMethod] = useState<PosCheckoutPaymentMethod>(
    POS_CHECKOUT_PAYMENT_DEFAULT
  )
  const [captureError, setCaptureError] = useState<string | null>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (success) {
      setView("success")
    }
  }, [success])

  useEffect(() => {
    if (view !== "bank_capture") {
      stopMediaStream(cameraStreamRef.current)
      cameraStreamRef.current = null
      const el = cameraVideoRef.current
      if (el) el.srcObject = null
      return
    }

    let cancelled = false
    ;(async () => {
      const stream = await startCheckoutCameraStream(cameraVideoRef.current)
      if (cancelled) {
        stopMediaStream(stream)
        return
      }
      if (!stream) {
        setCaptureError("Could not open camera — check permissions or device")
        return
      }
      cameraStreamRef.current = stream
      setCaptureError(null)
    })()

    return () => {
      cancelled = true
      stopMediaStream(cameraStreamRef.current)
      cameraStreamRef.current = null
      const el = cameraVideoRef.current
      if (el) el.srcObject = null
    }
  }, [view])

  const confirmLabel = posCheckoutConfirmLabel(paymentMethod)
  const displayError = view === "bank_capture" ? captureError ?? error : error

  function handleSelectMethod(method: PosCheckoutPaymentMethod) {
    if (pending) return
    setCaptureError(null)
    if (method === "BANK_TRANSFER") {
      setPaymentMethod(method)
      setView("bank_capture")
      return
    }
    setPaymentMethod(method)
  }

  async function handleCaptureAndPrint() {
    if (pending) return
    setCaptureError(null)
    const blob = await captureVideoFrame(cameraVideoRef.current)
    if (!blob) {
      setCaptureError("Capture failed — wait for camera or try again")
      return
    }
    onBankTransferCapture(blob)
  }

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
          {view === "success" ? "Sale complete" : view === "bank_capture" ? "Bank Transfer" : "Checkout"}
        </h2>

        {view === "success" && success ? (
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
        ) : view === "bank_capture" ? (
          <>
            <p className="text-sm text-white/90">Tell customer the total, then capture the transfer slip</p>
            <p className="text-4xl font-bold tabular-nums">{formatMoney(total)}</p>
            <div className="relative h-48 w-full max-w-md overflow-hidden rounded-lg border-2 border-white/60 bg-black">
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-contain"
              />
            </div>
            {displayError ? (
              <p className="max-w-md text-sm font-medium text-red-100" role="alert">
                {displayError}
              </p>
            ) : null}
            <div className="flex w-full max-w-md flex-col gap-2">
              <button
                type="button"
                onClick={() => void handleCaptureAndPrint()}
                disabled={pending || lines.length === 0}
                className="rounded-lg border-2 border-white bg-white px-8 py-3 text-base font-bold text-orange-700 shadow hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {pending ? "Processing…" : "Capture & Print"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pending) return
                  setCaptureError(null)
                  setView("select")
                }}
                disabled={pending}
                className="rounded-lg border-2 border-white/80 bg-transparent px-6 py-2 text-sm font-bold text-white shadow hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                Back
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
                    onClick={() => handleSelectMethod(option.value)}
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
            {displayError ? (
              <p className="max-w-xs text-sm font-medium text-red-100" role="alert">
                {displayError}
              </p>
            ) : null}
            {paymentMethod !== "BANK_TRANSFER" ? (
              <button
                type="button"
                onClick={() => onConfirm(paymentMethod)}
                disabled={pending || lines.length === 0}
                className="mt-2 rounded-lg border-2 border-white bg-white px-8 py-3 text-base font-bold text-orange-700 shadow hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {pending ? "Processing…" : confirmLabel}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
