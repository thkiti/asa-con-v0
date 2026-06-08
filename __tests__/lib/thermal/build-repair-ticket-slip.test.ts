import { buildRepairTicketSlipText } from "@/lib/thermal/build-repair-ticket-slip"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { THERMAL_COLUMNS } from "@/lib/thermal/format"

describe("buildRepairTicketSlipText", () => {
  it("renders ticket fields as thermal text", () => {
    const layout = resolveThermalLayout("REPAIR_TICKET", DEFAULT_THERMAL_LAYOUTS)
    const text = buildRepairTicketSlipText(
      {
        ticketNo: "RT-SH001-202606-0001",
        branchName: "Shop One",
        issuedAt: "2026-06-04T12:00:00.000Z",
        fileNames: ["a.jpg", "b.jpg"],
      },
      layout
    )
    expect(text).toContain("REPAIR TICKET")
    expect(text).toContain("RT-SH001-202606-0001")
    expect(text).toContain("Photos (2)")
    for (const line of text.split("\n")) {
      if (!line.length) continue
      expect(line.length).toBeLessThanOrEqual(THERMAL_COLUMNS)
    }
  })
})
