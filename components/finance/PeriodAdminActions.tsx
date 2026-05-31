"use client"

import { useState } from "react"
import type { PeriodAction } from "@/lib/finance-ui/period-fetchers"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import { HardCloseConfirmDialog } from "./HardCloseConfirmDialog"
import { HardReopenConfirmDialog } from "./HardReopenConfirmDialog"
import { SoftReopenConfirmDialog } from "./SoftReopenConfirmDialog"

export type PeriodActionOptions = {
  reason?: string
}

type PeriodAdminActionsProps = {
  period: AccountingPeriodRow
  sessionRole?: string
  disabled?: boolean
  submitting?: boolean
  onAction: (action: PeriodAction, options?: PeriodActionOptions) => Promise<void>
}

const buttonClassName =
  "rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"

export function PeriodAdminActions({
  period,
  sessionRole = "",
  disabled = false,
  submitting = false,
  onAction,
}: PeriodAdminActionsProps) {
  const [hardCloseOpen, setHardCloseOpen] = useState(false)
  const [hardReopenOpen, setHardReopenOpen] = useState(false)
  const [softReopenOpen, setSoftReopenOpen] = useState(false)

  const isHoAdmin = sessionRole.trim().toUpperCase() === "HO_ADMIN"

  async function handleAction(action: PeriodAction) {
    if (action === "HARD_CLOSE") {
      setHardCloseOpen(true)
      return
    }
    if (action === "REOPEN") {
      if (period.status === "HARD_CLOSED") {
        setHardReopenOpen(true)
        return
      }
      setSoftReopenOpen(true)
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

  async function confirmHardReopen(reason: string) {
    try {
      await onAction("REOPEN", { reason })
      setHardReopenOpen(false)
    } catch {
      // Parent surfaces errors.
    }
  }

  async function confirmSoftReopen(reason: string) {
    try {
      await onAction("REOPEN", { reason })
      setSoftReopenOpen(false)
    } catch {
      // Parent surfaces errors.
    }
  }

  const controlsDisabled = disabled || submitting

  if (period.status === "HARD_CLOSED") {
    return (
      <>
        <div className="flex flex-wrap gap-2">
          {isHoAdmin ? (
            <button
              type="button"
              disabled={controlsDisabled}
              onClick={() => void handleAction("REOPEN")}
              className={buttonClassName}
            >
              HARD REOPEN
            </button>
          ) : (
            <span className="text-sm text-zinc-500">Locked (HO_ADMIN to reopen)</span>
          )}
        </div>
        <HardReopenConfirmDialog
          period={period}
          open={hardReopenOpen}
          submitting={submitting}
          onClose={() => setHardReopenOpen(false)}
          onConfirm={confirmHardReopen}
        />
      </>
    )
  }

  const actions =
    period.status === "OPEN" ? (
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
    ) : (
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
      <SoftReopenConfirmDialog
        period={period}
        open={softReopenOpen}
        submitting={submitting}
        onClose={() => setSoftReopenOpen(false)}
        onConfirm={confirmSoftReopen}
      />
    </>
  )
}
