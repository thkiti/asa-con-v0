import { buildReadZSlipText } from "@/lib/thermal/build-read-z-slip"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { THERMAL_COLUMNS } from "@/lib/thermal/format"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

const baseReport: ReadReportPayload = {
  mode: "Z",
  bangkokDate: "2026-06-07",
  generatedAt: "2026-06-07T10:00:00.000Z",
  staffId: "001",
  staffName: "Test",
  branchCode: "SH001",
  branchName: "Chidlom",
  groupLines: [{ lineKey: "1", displayLeft: "010-Sample", qty: 1, amount: 60 }],
  paymentLines: [{ key: "CASH", label: "Cash", amount: 60 }],
  grandTotal: 60,
  saleCount: 1,
}

describe("buildReadZSlipText", () => {
  it("builds minimum Z slip from payload without extra aggregation", () => {
    const layout = resolveThermalLayout("READ_Z", DEFAULT_THERMAL_LAYOUTS)
    const text = buildReadZSlipText(baseReport, layout)
    expect(text).toContain("READ Z")
    expect(text).toContain("SH001")
    expect(text).toContain("Cash")
    expect(text).toContain("010-Sample")
    for (const line of text.split("\n")) {
      if (!line.length) continue
      expect(line.length).toBeLessThanOrEqual(THERMAL_COLUMNS)
    }
  })

  it("requires Z mode", () => {
    expect(() =>
      buildReadZSlipText(
        { ...baseReport, mode: "X" },
        resolveThermalLayout("READ_Z", DEFAULT_THERMAL_LAYOUTS)
      )
    ).toThrow(/requires Z report/)
  })
})
