"use client"

import { useState } from "react"
import type { PeriodAction } from "@/lib/finance-ui/period-fetchers"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import { HardCloseConfirmDialog } from "./HardCloseConfirmDialog"

type PeriodAdminActionsProps = {
  period: AccountingPeriodRow
  disabled?: boolean
  submitting?: boolean
  onAction: (action: PeriodAction) => Promise<void>
}

const buttonClassName =
  "rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"

export function PeriodAdminActions({
  period,
  disabled = false,
  submitting = false,
  onAction,
}: PeriodAdminActionsProps) {
  const [hardCloseOpen, setHardCloseOpen] = useState(false)

  if (period.status === "HARD_CLOSED") {
    return <span className="text-sm text-zinc-500">Locked</span>
  }

  async function handleAction(action: PeriodAction) {
    if (action === "HARD_CLOSE") {
      setHardCloseOpen(true)
      return
    }
    await onAction(action)
  }

  async function confirmHardClose() {
    try {
      await onAction("HARD_CLOSE")
      setHardCloseOpen(false)
    } catch {
      // Parent surfaces structured close gate errors.
    }
  }

  const controlsDisabled = disabled || submitting

  const actions = period.status === "OPEN"
    ? (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={() => void handleAction("SOFT_CLOSE")}
          className={buttonClassName}
        >
          SOFT CLOSE
        </button>
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={() => void handleAction("HARD_CLOSE")}
          className={buttonClassName}
        >
          HARD CLOSE
        </button>
      </div>
    )
    : (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={() => void handleAction("HARD_CLOSE")}
          className={buttonClassName}
        >
          HARD CLOSE
        </button>
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={() => void handleAction("REOPEN")}
          className={buttonClassName}
        >
          REOPEN
        </button>
      </div>
    )

  return (
    <>
      {actions}
      <HardCloseConfirmDialog
        period={period}
        open={hardCloseOpen}
        submitting={submitting}
        onClose={() => setHardCloseOpen(false)}
        onConfirm={confirmHardClose}
      />
    </>
  )
}
