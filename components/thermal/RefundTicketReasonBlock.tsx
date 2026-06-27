"use client"

import { RECEIPT_SLIP_PROPORTIONAL_CLASS } from "@/lib/thermal/receipt-slip-fonts"

const REASON_LABEL = "REASON:"

type RefundTicketReasonBlockProps = {
  reason: string | null | undefined
  testId?: string
}

/** Refund reason — inline label + value with natural wrap at printable width. */
export function RefundTicketReasonBlock({
  reason,
  testId = "refund-ticket-reason",
}: RefundTicketReasonBlockProps) {
  const text = reason?.trim() ?? ""
  if (!text) {
    return (
      <div
        className={`${RECEIPT_SLIP_PROPORTIONAL_CLASS} refund-ticket-reason receipt-setup-mono-body w-full font-semibold leading-tight text-zinc-900`}
        data-testid={testId}
      >
        {REASON_LABEL}
      </div>
    )
  }

  return (
    <div
      className={`${RECEIPT_SLIP_PROPORTIONAL_CLASS} refund-ticket-reason receipt-setup-mono-body w-full leading-tight text-zinc-900`}
      data-testid={testId}
    >
      <p className="refund-ticket-reason-text m-0 w-full whitespace-pre-wrap break-words">
        <span className="font-semibold">{REASON_LABEL} </span>
        {text}
      </p>
    </div>
  )
}

export { REASON_LABEL }
