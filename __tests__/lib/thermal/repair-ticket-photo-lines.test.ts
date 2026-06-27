import { appendRepairTicketPhotoLines } from "@/lib/thermal/repair-ticket-photo-lines"
import { THERMAL_COLUMNS } from "@/lib/thermal/format"

describe("appendRepairTicketPhotoLines", () => {
  it("wraps long filenames without truncating characters", () => {
    const fileName = "REP-SH001-202606-0007-01.jpg"
    const lines: string[] = []
    appendRepairTicketPhotoLines(lines, [fileName], THERMAL_COLUMNS)

    expect(lines[0]).toBe("Photos (1)")
    const flattened = lines.join("").replace(/\s+/g, "")
    expect(flattened).toContain(fileName.replace(/\s+/g, ""))
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(THERMAL_COLUMNS)
    }
  })
})
