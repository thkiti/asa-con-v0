"use client"

import { PosTerminalLiveClock } from "./PosTerminalLiveClock"
import { posTerminalClockStrip } from "@/lib/pos-ui/pos-terminal-classes"

type PosKeypadMessageBlockProps = {
  pendingEvidenceCount: number
  onOpenPendingEvidence: () => void
  cartLookupError?: string | null
}

/**
 * Fixed-height reserved slot below LOGOUT / digit pad / ENTER (keypad row 5, cols 1–5).
 * Always mounted so warnings do not shift the terminal layout.
 */
export function PosKeypadMessageBlock({
  pendingEvidenceCount,
  onOpenPendingEvidence,
  cartLookupError = null,
}: PosKeypadMessageBlockProps) {
  const trimmedError = cartLookupError?.trim() ?? ""
  const showSlipPending = pendingEvidenceCount > 0

  return (
    <div
      data-testid="pos-keypad-message-block"
      className={`${posTerminalClockStrip} flex h-full min-h-0 items-stretch overflow-hidden rounded-lg border`}
    >
      {showSlipPending ? (
        <button
          type="button"
          onClick={onOpenPendingEvidence}
          className="pos-evidence-pending-blink flex h-full w-full items-center justify-center rounded-lg border-2 border-red-900 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 px-3 text-center text-2xl font-black leading-tight text-white shadow-md hover:brightness-105 active:translate-y-px"
          data-testid="pos-evidence-pending-banner"
        >
          SLIP PENDING — {pendingEvidenceCount} bank transfer receipt
          {pendingEvidenceCount === 1 ? "" : "s"} need upload
        </button>
      ) : trimmedError ? (
        <p
          className="flex h-full w-full items-center px-3 text-xs font-medium leading-tight text-red-800 sm:text-sm"
          data-testid="pos-keypad-cart-error"
        >
          {trimmedError}
        </p>
      ) : (
        <PosTerminalLiveClock />
      )}
    </div>
  )
}
