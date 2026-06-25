import { formatPosTerminalClock } from "@/lib/pos-ui/format-pos-terminal-clock"

describe("formatPosTerminalClock", () => {
  it("formats Bangkok date and time on one line", () => {
    const d = new Date("2026-06-24T14:35:08+07:00")
    expect(formatPosTerminalClock(d)).toBe("WED 24/06/2026 14:35:08")
  })

  it("pads single-digit day and month", () => {
    const d = new Date("2026-01-05T09:04:03+07:00")
    expect(formatPosTerminalClock(d)).toBe("MON 05/01/2026 09:04:03")
  })
})
