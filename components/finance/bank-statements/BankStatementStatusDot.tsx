"use client"

import type { BankStatementStatus } from "@/lib/finance/bank-statement"
import { bankStatementStatusTooltip } from "@/lib/finance-ui/bank-statements"

const statusClass: Record<BankStatementStatus, string> = {
  NEW: "bg-[var(--tone-error-fg)]",
  DRAFT: "bg-[var(--tone-warning-fg,#ca8a04)]",
  READY: "bg-[var(--tone-success-fg)]",
}

type BankStatementStatusDotProps = {
  status: BankStatementStatus
  testId?: string
}

export function BankStatementStatusDot({ status, testId }: BankStatementStatusDotProps) {
  const tooltip = bankStatementStatusTooltip(status)

  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${statusClass[status]}`}
      title={tooltip}
      aria-label={tooltip}
      data-testid={testId ?? `bank-statement-status-${status.toLowerCase()}`}
    />
  )
}
