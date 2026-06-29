"use client"

import { useState } from "react"
import Link from "next/link"
import type { PeriodAction } from "@/lib/finance-ui/period-fetchers"
import type { ReopenRequestDetail } from "@/lib/finance-ui/reopen-requests"
import { buildReopenRequestsPath } from "@/lib/finance-ui/reopen-requests"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import {
  themeBannerWarning,
  themeBtnSecondary,
  themeLinkMuted,
  themeMuted,
} from "@/lib/finance-ui/finance-visual-classes"
import { HardCloseConfirmDialog } from "./HardCloseConfirmDialog"
import { HardReopenRequestDialog } from "./HardReopenRequestDialog"
import { SoftReopenConfirmDialog } from "./SoftReopenConfirmDialog"

export type PeriodActionOptions = {
  reason?: string
}

type PeriodAdminActionsProps = {
  period: AccountingPeriodRow
  sessionRole?: string
  pendingReopenRequest?: ReopenRequestDetail | null
  disabled?: boolean
  submitting?: boolean
  onAction: (action: PeriodAction, options?: PeriodActionOptions) => Promise<void>
  onReopenRequest?: (reason: string) => Promise<void>
}

const buttonClassName = themeBtnSecondary

export function PeriodAdminActions({
  period,
  sessionRole = "",
  pendingReopenRequest = null,
  disabled = false,
  submitting = false,
  onAction,
  onReopenRequest,
}: PeriodAdminActionsProps) {
  const [hardCloseOpen, setHardCloseOpen] = useState(false)
  const [hardReopenRequestOpen, setHardReopenRequestOpen] = useState(false)
  const [softReopenOpen, setSoftReopenOpen] = useState(false)

  const role = sessionRole.trim().toUpperCase()
  const canRequestHardReopen = role === "HO_FINANCE" || role === "HO_ADMIN"

  async function handleAction(action: PeriodAction) {
    if (action === "HARD_CLOSE") {
      setHardCloseOpen(true)
      return
    }
    if (action === "REOPEN") {
      if (period.status === "HARD_CLOSED") {
        setHardReopenRequestOpen(true)
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

  async function confirmHardReopenRequest(reason: string) {
    if (!onReopenRequest) return
    try {
      await onReopenRequest(reason)
      setHardReopenRequestOpen(false)
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
        <div className="flex flex-wrap items-center gap-2">
          {pendingReopenRequest ? (
            <>
              <span className={`${themeBannerWarning} px-2 py-1 text-xs`}>
                Pending: {pendingReopenRequest.requestNo}
              </span>
              <Link
                href={buildReopenRequestsPath(period.id)}
                className={`text-sm ${themeLinkMuted}`}
              >
                Review requests
              </Link>
            </>
          ) : canRequestHardReopen ? (
            <button
              type="button"
              disabled={controlsDisabled}
              onClick={() => void handleAction("REOPEN")}
              className={buttonClassName}
            >
              REQUEST REOPEN
            </button>
          ) : (
            <span className={`text-sm ${themeMuted}`}>
              Locked (HO_FINANCE or HO_ADMIN to request reopen)
            </span>
          )}
        </div>
        <HardReopenRequestDialog
          period={period}
          open={hardReopenRequestOpen}
          submitting={submitting}
          onClose={() => setHardReopenRequestOpen(false)}
          onConfirm={confirmHardReopenRequest}
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
