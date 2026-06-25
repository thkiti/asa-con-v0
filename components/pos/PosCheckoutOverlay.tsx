"use client"

import { cartTotal } from "@/lib/pos/cart"
import type { PosCartLine } from "@/lib/pos/cart"
import {
  captureVideoFrame,
  startCheckoutCameraStream,
  stopMediaStream,
} from "@/lib/pos-ui/capture-video-frame"
import {
  POS_BANK_TRANSFER_UPLOAD_LATER_LABEL,
  POS_CHECKOUT_PAYMENT_OPTIONS,
  POS_PRINT_RECEIPT_LABEL,
  type PosCheckoutPaymentMethod,
} from "@/lib/pos-ui/pos-payment-methods"
import { useEffect, useRef, useState } from "react"

export type PosCheckoutPrintReceiptInput = {
  paymentMethod: PosCheckoutPaymentMethod
  paidAmount: number
  bankTransferEvidence?: Blob | null
}

type PosCheckoutOverlayProps = {
  lines: readonly PosCartLine[]
  pending: boolean
  error: string | null
  onPrintReceipt: (input: PosCheckoutPrintReceiptInput) => void
  onClose: () => void
}

type CheckoutView = "select" | "cash_amount" | "confirm" | "bank_capture"

function formatMoney(value: number | string): string {
  const n = typeof value === "number" ? value : Number(value)
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function parsePaidAmount(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function PaymentSummary({
  total,
  amountReceived,
  change,
}: {
  total: number
  amountReceived: number
  change: number
}) {
  return (
    <div
      className="w-full max-w-xs space-y-2 rounded-lg border-2 border-white/60 bg-white/10 px-4 py-3 text-left"
      data-testid="pos-checkout-payment-summary"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-white/90">Total Amount</span>
        <span className="text-xl font-bold tabular-nums">{formatMoney(total)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-white/90">Amount Received</span>
        <span className="text-xl font-bold tabular-nums">{formatMoney(amountReceived)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-white/90">Change Money</span>
        <span className="text-xl font-bold tabular-nums">{formatMoney(change)}</span>
      </div>
    </div>
  )
}

export function PosCheckoutOverlay({
  lines,
  pending,
  error,
  onPrintReceipt,
  onClose,
}: PosCheckoutOverlayProps) {
  const total = cartTotal(lines)
  const totalNumber = Number(total)
  const [view, setView] = useState<CheckoutView>("select")
  const [paymentMethod, setPaymentMethod] = useState<PosCheckoutPaymentMethod>("CASH")
  const [amountPaidInput, setAmountPaidInput] = useState("")
  const [confirmedPaidAmount, setConfirmedPaidAmount] = useState<number | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const [bankTransferBlob, setBankTransferBlob] = useState<Blob | null | undefined>(undefined)
  const amountPaidRef = useRef<HTMLInputElement>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (view === "cash_amount") {
      amountPaidRef.current?.focus()
    }
  }, [view])

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

  const displayError =
    view === "bank_capture" ? captureError ?? localError ?? error : localError ?? error
  const canUploadLater = view === "bank_capture" && Boolean(captureError)

  function resetFlowState() {
    setLocalError(null)
    setCaptureError(null)
    setAmountPaidInput("")
    setConfirmedPaidAmount(null)
    setBankTransferBlob(undefined)
  }

  function openConfirmForMethod(
    method: PosCheckoutPaymentMethod,
    paidAmount: number,
    evidence?: Blob | null
  ) {
    setPaymentMethod(method)
    setConfirmedPaidAmount(paidAmount)
    if (method === "BANK_TRANSFER") {
      setBankTransferBlob(evidence ?? null)
    }
    setLocalError(null)
    setView("confirm")
  }

  function handleSelectMethod(method: PosCheckoutPaymentMethod) {
    if (pending) return
    resetFlowState()
    setPaymentMethod(method)

    if (method === "BANK_TRANSFER") {
      setView("bank_capture")
      return
    }

    if (method === "CARD") {
      openConfirmForMethod("CARD", totalNumber)
      return
    }

    setView("cash_amount")
  }

  function handleConfirmCashAmount() {
    if (pending) return
    const paid = parsePaidAmount(amountPaidInput)
    if (paid == null) {
      setLocalError("Enter a valid amount paid")
      amountPaidRef.current?.focus()
      return
    }
    if (paid < totalNumber) {
      setLocalError(`Amount paid must be at least ${formatMoney(totalNumber)}`)
      amountPaidRef.current?.focus()
      return
    }
    setLocalError(null)
    openConfirmForMethod("CASH", paid)
  }

  function handlePrintReceipt() {
    if (pending || lines.length === 0) return

    const paidAmount =
      paymentMethod === "CASH"
        ? confirmedPaidAmount ?? totalNumber
        : totalNumber

    onPrintReceipt({
      paymentMethod,
      paidAmount,
      bankTransferEvidence:
        paymentMethod === "BANK_TRANSFER" ? bankTransferBlob ?? null : undefined,
    })
  }

  async function handleCaptureSlip() {
    if (pending) return
    setCaptureError(null)
    setLocalError(null)
    const blob = await captureVideoFrame(cameraVideoRef.current)
    if (!blob) {
      setCaptureError("Capture failed — wait for camera or try again")
      return
    }
    openConfirmForMethod("BANK_TRANSFER", totalNumber, blob)
  }

  function handleContinueWithoutSlip() {
    if (pending) return
    setLocalError(null)
    openConfirmForMethod("BANK_TRANSFER", totalNumber, null)
  }

  function handleBack() {
    if (pending) return
    if (view === "confirm") {
      if (paymentMethod === "CASH") {
        setView("cash_amount")
        setConfirmedPaidAmount(null)
        return
      }
      if (paymentMethod === "BANK_TRANSFER") {
        resetFlowState()
        setView("bank_capture")
        return
      }
    }
    resetFlowState()
    setView("select")
  }

  const amountReceived =
    paymentMethod === "CASH" ? confirmedPaidAmount ?? totalNumber : totalNumber
  const changeMoney = Math.max(0, amountReceived - totalNumber)

  const title =
    view === "bank_capture"
      ? "Bank Transfer"
      : view === "cash_amount"
        ? "Cash Payment"
        : view === "confirm"
          ? "Confirm Payment"
          : "Checkout"

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
          {title}
        </h2>

        {view === "bank_capture" ? (
          <>
            <p className="text-sm text-white/90">Tell customer the total, then capture the transfer slip</p>
            <p className="text-4xl font-bold tabular-nums">{formatMoney(totalNumber)}</p>
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
                onClick={() => void (canUploadLater ? handleContinueWithoutSlip() : handleCaptureSlip())}
                disabled={pending || lines.length === 0}
                className="rounded-lg border-2 border-white bg-white px-8 py-3 text-base font-bold text-orange-700 shadow hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {pending
                  ? "Processing…"
                  : canUploadLater
                    ? POS_BANK_TRANSFER_UPLOAD_LATER_LABEL
                    : "Capture Slip"}
              </button>
              <button
                type="button"
                onClick={handleBack}
                disabled={pending}
                className="rounded-lg border-2 border-white/80 bg-transparent px-6 py-2 text-sm font-bold text-white shadow hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                Back
              </button>
            </div>
          </>
        ) : view === "cash_amount" ? (
          <>
            <p className="text-sm text-white/90">
              {lines.length} line{lines.length === 1 ? "" : "s"}
            </p>
            <p className="text-3xl font-bold tabular-nums">{formatMoney(totalNumber)}</p>
            <label className="w-full max-w-xs text-left text-xs font-bold text-white/90">
              Amount Paid
            </label>
            <input
              ref={amountPaidRef}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amountPaidInput}
              disabled={pending}
              data-testid="pos-checkout-amount-paid"
              onChange={(event) => {
                setAmountPaidInput(event.target.value)
                if (localError) setLocalError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleConfirmCashAmount()
                }
              }}
              className="w-full max-w-xs rounded-lg border-2 border-white bg-white px-4 py-3 text-right text-2xl font-bold tabular-nums text-orange-700 shadow disabled:cursor-not-allowed disabled:opacity-60"
            />
            {displayError ? (
              <p
                className="max-w-xs text-sm font-medium text-red-100"
                role="alert"
                data-testid="pos-checkout-amount-error"
              >
                {displayError}
              </p>
            ) : null}
            <div className="flex w-full max-w-xs flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmCashAmount}
                disabled={pending || lines.length === 0}
                className="rounded-lg border-2 border-white bg-white px-8 py-3 text-base font-bold text-orange-700 shadow hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={handleBack}
                disabled={pending}
                className="rounded-lg border-2 border-white/80 bg-transparent px-6 py-2 text-sm font-bold text-white shadow hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                Back
              </button>
            </div>
          </>
        ) : view === "confirm" ? (
          <>
            <PaymentSummary
              total={totalNumber}
              amountReceived={amountReceived}
              change={changeMoney}
            />
            {displayError ? (
              <p className="max-w-xs text-sm font-medium text-red-100" role="alert">
                {displayError}
              </p>
            ) : null}
            <div className="flex w-full max-w-xs flex-col gap-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                disabled={pending || lines.length === 0}
                data-testid="pos-checkout-print-receipt"
                className="rounded-lg border-2 border-white bg-white px-8 py-3 text-base font-bold text-orange-700 shadow hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {pending ? "Processing…" : POS_PRINT_RECEIPT_LABEL}
              </button>
              <button
                type="button"
                onClick={handleBack}
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
            <p className="text-3xl font-bold tabular-nums">{formatMoney(totalNumber)}</p>
            <p className="w-full max-w-xs text-left text-xs font-bold text-white/90">
              Payment method
            </p>
            <div
              className="grid w-full max-w-xs grid-cols-1 gap-2"
              role="group"
              aria-label="Payment method"
            >
              {POS_CHECKOUT_PAYMENT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={pending}
                  onClick={() => handleSelectMethod(option.value)}
                  className="rounded-lg border-2 border-white/70 bg-white/15 px-4 py-3 text-sm font-bold text-white shadow hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {option.label}
                </button>
              ))}
            </div>
            {displayError ? (
              <p className="max-w-xs text-sm font-medium text-red-100" role="alert">
                {displayError}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
