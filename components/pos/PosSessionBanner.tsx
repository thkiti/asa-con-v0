import type { PosTerminalSession } from "@/lib/pos-ui/types"
import {
  formatBranchDisplay,
  formatStaffDisplay,
} from "@/lib/pos-ui/pos-session-display"

type PosSessionBannerProps = {
  session: PosTerminalSession
}

export function PosSessionBanner({ session }: PosSessionBannerProps) {
  return (
    <header className="shrink-0 rounded-lg border border-zinc-500/80 bg-white/90 px-4 py-2.5 text-zinc-900 shadow-sm">
      <div className="space-y-1 text-sm font-semibold leading-snug sm:text-base">
        <div>
          <span className="text-zinc-600">Branch: </span>
          {formatBranchDisplay(session.branchCode, session.branchName)}
        </div>
        <div>
          <span className="text-zinc-600">Staff: </span>
          {formatStaffDisplay(session.staffId, session.name)}
        </div>
      </div>
    </header>
  )
}
