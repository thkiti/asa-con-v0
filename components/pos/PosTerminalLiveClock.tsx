"use client"

import { formatPosTerminalClock } from "@/lib/pos-ui/format-pos-terminal-clock"
import { posTerminalClock } from "@/lib/pos-ui/pos-terminal-classes"
import { useEffect, useState } from "react"

export function PosTerminalLiveClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  const display = formatPosTerminalClock(now)

  return (
    <div
      data-testid="pos-terminal-live-clock"
      className="flex h-full w-full min-w-0 items-center justify-center overflow-hidden px-2"
    >
      <time dateTime={now.toISOString()} className={posTerminalClock}>
        {display}
      </time>
    </div>
  )
}
