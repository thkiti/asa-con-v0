"use client"

import { RECEIPT_SLIP_MONO_CLASS, RECEIPT_SLIP_PROPORTIONAL_CLASS } from "@/lib/thermal/receipt-slip-fonts"

const monoLineClass = `${RECEIPT_SLIP_MONO_CLASS} receipt-slip-mono-line leading-tight text-zinc-900`
const proportionalLineClass = `${RECEIPT_SLIP_PROPORTIONAL_CLASS} receipt-setup-proportional-line leading-tight text-zinc-900`

export function TicketSetupDivider({ testId }: { testId?: string }) {
  return (
    <div
      className={`${monoLineClass} receipt-setup-mono-divider`}
      aria-hidden
      data-testid={testId ?? "ticket-setup-mono-divider"}
    />
  )
}

export function TicketSetupDottedLine({ testId }: { testId?: string }) {
  return (
    <div
      className={`${proportionalLineClass} receipt-setup-dotted-line`}
      aria-hidden
      data-testid={testId ?? "ticket-setup-dotted-line"}
    />
  )
}

export function TicketSetupMonoLine({
  children,
  testId,
}: {
  children: string
  testId?: string
}) {
  return (
    <div
      className={`${monoLineClass} receipt-setup-mono-text-line truncate`}
      data-testid={testId}
    >
      {children}
    </div>
  )
}

export function TicketSetupMonoAmountRow({
  left,
  right,
  testId,
}: {
  left: string
  right: string
  testId?: string
}) {
  return (
    <div
      className={`${monoLineClass} receipt-setup-mono-amount-row flex min-w-0`}
      data-testid={testId}
    >
      <span className="min-w-0 flex-1 truncate">{left}</span>
      <span className="shrink-0 tabular-nums">{right}</span>
    </div>
  )
}

export function TicketSetupProportionalCentered({
  children,
  bold,
  testId,
}: {
  children: string
  bold?: boolean
  testId?: string
}) {
  if (!children.trim()) return null
  return (
    <div
      className={`${proportionalLineClass} w-full truncate text-center ${bold ? "font-bold" : "font-semibold"}`}
      data-testid={testId}
    >
      {children}
    </div>
  )
}

export function TicketSetupProportionalLine({
  children,
  testId,
}: {
  children: string
  testId?: string
}) {
  if (!children.trim()) return null
  return (
    <div
      className={`${proportionalLineClass} w-full min-w-0 truncate`}
      data-testid={testId}
    >
      {children}
    </div>
  )
}

export function TicketSetupLabelValueRow({
  label,
  value,
  stacked = false,
  testId,
}: {
  label: string
  value: string
  stacked?: boolean
  testId?: string
}) {
  if (stacked) {
    return (
      <div className={`${proportionalLineClass} w-full min-w-0 space-y-0.5`} data-testid={testId}>
        <div className="font-semibold">{label}</div>
        <div className="truncate">{value}</div>
      </div>
    )
  }

  return (
    <div
      className={`${proportionalLineClass} flex w-full min-w-0 items-baseline justify-between gap-1`}
      data-testid={testId}
    >
      <span className="shrink-0 font-semibold">{label}</span>
      <span className="min-w-0 truncate text-right">{value}</span>
    </div>
  )
}

export function TicketSetupAckField({
  label,
  writingLines = 1,
  testId,
}: {
  label: string
  writingLines?: number
  testId?: string
}) {
  return (
    <div className="receipt-setup-ack-field w-full min-w-0 space-y-1" data-testid={testId}>
      <div className={`${proportionalLineClass} font-semibold`}>{label}</div>
      <div className="receipt-setup-ack-writing-space">
        {Array.from({ length: writingLines }, (_, index) => (
          <TicketSetupDottedLine
            key={index}
            testId={index === 0 ? `${testId ?? "ticket-setup-ack"}-line` : undefined}
          />
        ))}
      </div>
    </div>
  )
}
