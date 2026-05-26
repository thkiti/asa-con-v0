"use client"

import type { PeriodAction } from "@/lib/finance-ui/period-fetchers"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"

type PeriodAdminActionsProps = {
  period: AccountingPeriodRow
  disabled?: boolean
  onAction: (action: PeriodAction) => Promise<void>
}

const buttonClassName =
  "rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"

export function PeriodAdminActions({
  period,
  disabled = false,
  onAction,
}: PeriodAdminActionsProps) {
  if (period.status === "HARD_CLOSED") {
    return <span className="text-sm text-zinc-500">Locked</span>
  }

  async function handleAction(action: PeriodAction) {
    if (action === "HARD_CLOSE") {
      const confirmed = window.confirm(
        `Hard close period ${period.periodKey} for branch ${period.branchId}? This cannot be undone from this screen.`
      )
      if (!confirmed) return
    }
    await onAction(action)
  }

  if (period.status === "OPEN") {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void handleAction("SOFT_CLOSE")}
          className={buttonClassName}
        >
          SOFT CLOSE
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void handleAction("HARD_CLOSE")}
          className={buttonClassName}
        >
          HARD CLOSE
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => void handleAction("HARD_CLOSE")}
        className={buttonClassName}
      >
        HARD CLOSE
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => void handleAction("REOPEN")}
        className={buttonClassName}
      >
        REOPEN
      </button>
    </div>
  )
}
