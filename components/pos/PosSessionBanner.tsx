"use client"

import type { PosTerminalSession } from "@/lib/pos-ui/types"
import { isPosHoStaffRole } from "@/lib/pos-ui/pos-staff-role"
import { POS_SESSION_BANNER_BORDER_CLASS } from "@/lib/pos-ui/pos-panel-frame"
import {
  posTerminalBanner,
  posTerminalBannerText,
} from "@/lib/pos-ui/pos-terminal-classes"
import {
  formatBranchDisplay,
  formatStaffDisplay,
} from "@/lib/pos-ui/pos-session-display"

type PosSessionBannerProps = {
  session: PosTerminalSession
  onOpenReadZLookup?: () => void
}

export function PosSessionBanner({ session, onOpenReadZLookup }: PosSessionBannerProps) {
  const showReadZLookup = isPosHoStaffRole(session.role) && onOpenReadZLookup

  return (
    <header
      className={`${posTerminalBanner} shrink-0 rounded-lg ${POS_SESSION_BANNER_BORDER_CLASS} px-4 py-2.5`}
    >
      <div className={`${posTerminalBannerText} space-y-1 text-sm leading-snug sm:text-base`}>
        <div>
          Branch: {formatBranchDisplay(session.branchCode, session.branchName)}
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span>
            Staff: {formatStaffDisplay(session.staffId, session.name)}
          </span>
          {showReadZLookup ? (
            <button
              type="button"
              onClick={onOpenReadZLookup}
              data-testid="pos-open-read-z-lookup"
              className="rounded border border-orange-700 bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-800 hover:bg-orange-100"
            >
              READ Z Lookup
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
