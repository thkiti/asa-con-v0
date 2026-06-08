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
  paymentLines: [
    { key: "CASH", label: "Cash", amount: 60 },
    { key: "CREDIT_CARD", label: "Credit Card", amount: 0 },
  ],
  grandTotal: 60,
  saleCount: 1,
  refundCount: 0,
  refundTotal: 0,
  netTotal: 60,
}

describe("buildReadZSlipText", () => {
  it("builds operational Z slip from shared ReadReportPayload", () => {
    const layout = resolveThermalLayout("READ_Z", DEFAULT_THERMAL_LAYOUTS)
    const text = buildReadZSlipText(baseReport, layout)
    expect(text).toContain("READ Z")
    expect(text).toContain("SH001")
    expect(text).toContain("Receipts")
    expect(text).toContain("Net sales")
    expect(text).toContain("Cash")
    expect(text).toContain("010-Sample")
    for (const line of text.split("\n")) {
      if (!line.length) continue
      expect(line.length).toBeLessThanOrEqual(THERMAL_COLUMNS)
    }
  })

  it("orders sections Header → Group → Payment → Summary → Total → Footer", () => {
    const layout = resolveThermalLayout("READ_Z", DEFAULT_THERMAL_LAYOUTS)
    const text = buildReadZSlipText(
      {
        ...baseReport,
        footerLine1: "Thank you",
        groupLines: [{ lineKey: "1", displayLeft: "010-Sample", qty: 1, amount: 60 }],
        refundCount: 1,
        refundTotal: 10,
        netTotal: 50,
      },
      { ...layout, footerLine1: "Thank you" }
    )
    const lines = text.split("\n").filter((line) => line.length > 0)

    const groupIdx = lines.findIndex((line) => line.includes("Group Code-Name"))
    const sampleIdx = lines.findIndex((line) => line.includes("010-Sample"))
    const cashIdx = lines.findIndex((line) => line.includes("Cash"))
    const receiptsIdx = lines.findIndex((line) => line.startsWith("Receipts"))
    const totalIdx = lines.findIndex((line) => line.trim().startsWith("TOTAL"))
    const footerIdx = lines.findIndex((line) => line.includes("Thank you"))

    expect(groupIdx).toBeGreaterThan(-1)
    expect(sampleIdx).toBeGreaterThan(groupIdx)
    expect(cashIdx).toBeGreaterThan(sampleIdx)
    expect(receiptsIdx).toBeGreaterThan(cashIdx)
    expect(totalIdx).toBeGreaterThan(receiptsIdx)
    expect(footerIdx).toBeGreaterThan(totalIdx)
  })

  it("shows refund total when refunds exist", () => {
    const layout = resolveThermalLayout("READ_Z", DEFAULT_THERMAL_LAYOUTS)
    const text = buildReadZSlipText(
      {
        ...baseReport,
        grandTotal: 100,
        refundCount: 1,
        refundTotal: 25,
        netTotal: 75,
      },
      layout
    )
    expect(text).toContain("Refund total")
    expect(text).toContain("25.00")
    expect(text).toContain("Net sales")
    expect(text).toContain("75.00")
  })

  it("prints the same group rows as the on-screen READ Z report", () => {
    const layout = resolveThermalLayout("READ_Z", DEFAULT_THERMAL_LAYOUTS)
    const groupLines = [
      { lineKey: "0101901", displayLeft: "0101901-Home Small", qty: 0, amount: 0 },
      { lineKey: "0101902", displayLeft: "0101902-Home Large", qty: 2, amount: 60 },
      { lineKey: "5100900", displayLeft: "5100900-Ladies Heels", qty: 1, amount: 25 },
    ]
    const text = buildReadZSlipText({ ...baseReport, groupLines }, layout)

    expect(text).toContain("0101901-Home Small")
    expect(text).toContain("0101902-Home Large")
    expect(text).toContain("5100900-Ladies Heels")
    expect(text).not.toContain("0100900")
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
