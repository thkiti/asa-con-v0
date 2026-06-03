import type { PosTerminalSession } from "@/lib/pos-ui/types"

type PosSessionBannerProps = {
  session: PosTerminalSession
}

export function PosSessionBanner({ session }: PosSessionBannerProps) {
  return (
    <header className="shrink-0 rounded-lg border border-zinc-500/80 bg-white/90 px-3 py-2 text-zinc-900 shadow-sm">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:text-sm">
        <div>
          <span className="font-semibold text-zinc-600">Branch code</span>
          <div className="font-mono font-bold tabular-nums">
            {session.branchCode}
          </div>
        </div>
        <div>
          <span className="font-semibold text-zinc-600">Branch name</span>
          <div className="truncate font-bold">{session.branchName}</div>
        </div>
        <div>
          <span className="font-semibold text-zinc-600">Staff ID</span>
          <div className="font-mono font-bold tabular-nums">
            {session.staffId}
          </div>
        </div>
        <div>
          <span className="font-semibold text-zinc-600">Staff name</span>
          <div className="truncate font-bold">{session.name}</div>
        </div>
      </div>
    </header>
  )
}
