import type { PosTerminalSession } from "@/lib/pos-ui/types"
import { POS_SESSION_BANNER_BORDER_CLASS } from "@/lib/pos-ui/pos-panel-frame"
import {
  formatBranchDisplay,
  formatStaffDisplay,
} from "@/lib/pos-ui/pos-session-display"

type PosSessionBannerProps = {
  session: PosTerminalSession
}

export function PosSessionBanner({ session }: PosSessionBannerProps) {
  return (
    <header
      className={`shrink-0 rounded-lg ${POS_SESSION_BANNER_BORDER_CLASS} bg-[#F2F6FA] px-4 py-2.5 text-zinc-900`}
    >
      <div className="space-y-1 text-sm font-black leading-snug text-zinc-900 sm:text-base">
        <div>
          Branch: {formatBranchDisplay(session.branchCode, session.branchName)}
        </div>
        <div>
          Staff: {formatStaffDisplay(session.staffId, session.name)}
        </div>
      </div>
    </header>
  )
}
