"use client"

import type { BankStatementStatus } from "@/lib/finance/bank-statement/bank-statement-types"

const statusClass: Record<BankStatementStatus, string> = {
  NEW: "bg-[var(--tone-error-fg)]",
  DRAFT: "bg-[var(--tone-warning-fg,#ca8a04)]",
  READY: "bg-[var(--tone-success-fg)]",
}

export function bankCashCheckStatusTooltip(status: BankStatementStatus): string {
  switch (status) {
    case "READY":
      return "Bank statement check completed."
    case "DRAFT":
      return "Draft — check in progress"
    case "NEW":
      return "New — not yet reviewed"
    default:
      return status
  }
}

type BankCashCheckStatusDotProps = {
  status: BankStatementStatus
  testId?: string
}

export function BankCashCheckStatusDot({ status, testId }: BankCashCheckStatusDotProps) {
  const tooltip = bankCashCheckStatusTooltip(status)

  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${statusClass[status]}`}
      title={tooltip}
      aria-label={tooltip}
      data-testid={testId ?? `bank-cash-check-status-${status.toLowerCase()}`}
    />
  )
}
