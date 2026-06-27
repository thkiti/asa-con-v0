import {
  THERMAL_COLUMNS,
  THERMAL_PAPER_SIDE_INSET_MM,
  THERMAL_PAPER_WIDTH_MM,
  THERMAL_PRINTABLE_WIDTH_MM,
} from "@/lib/thermal/thermal-paper"

describe("thermal paper sizing", () => {
  it("uses 80mm paper with 72mm printable content and 30 monospace columns", () => {
    expect(THERMAL_PAPER_WIDTH_MM).toBe(80)
    expect(THERMAL_PRINTABLE_WIDTH_MM).toBe(72)
    expect(THERMAL_PAPER_SIDE_INSET_MM).toBe(4)
    expect(THERMAL_COLUMNS).toBe(30)
  })
})

describe("THERMAL_PRINT_SCALE", () => {
  it("provides driver compensation constant for print clone only", async () => {
    const { THERMAL_PRINT_SCALE, THERMAL_PRINT_SCALED_PAPER_WIDTH_MM } = await import(
      "@/lib/thermal/thermal-paper"
    )
    expect(THERMAL_PRINT_SCALE).toBe(0.91)
    expect(THERMAL_PRINT_SCALED_PAPER_WIDTH_MM).toBeCloseTo(72.8, 5)
  })
})

describe("buildCollectorSlipBodyText", () => {
  it("matches layout body text in full serialized slip", async () => {
    const { buildCollectorSlipText, buildCollectorSlipBodyText } = await import(
      "@/lib/thermal/build-collector-slip"
    )
    const { buildTicketLayout } = await import("@/lib/thermal/build-ticket-layout")
    const { DEFAULT_THERMAL_LAYOUTS } = await import("@/lib/thermal/layout-defaults")

    const report = {
      mode: "COLLECT" as const,
      bangkokDate: "2026-06-03 – 2026-06-05",
      bangkokDateFrom: "2026-06-03",
      bangkokDateTo: "2026-06-05",
      generatedAt: "2026-06-26T08:16:00.000Z",
      staffId: "001",
      staffName: "Kiti Thengtrirat",
      branchCode: "SH001",
      branchName: "Shop One",
      groupLines: [],
      paymentLines: [],
      dailyCashLines: [
        { salesDateYmd: "2026-06-03", cashAmount: 120, ticketCount: 1 },
      ],
      grandTotal: 120,
      saleCount: 1,
      refundCount: 0,
      refundTotal: 0,
      netTotal: 120,
    }

    const layout = DEFAULT_THERMAL_LAYOUTS.COLLECTOR
    const full = buildCollectorSlipText(report, layout)
    const body = buildCollectorSlipBodyText(report)
    const ticketLayout = buildTicketLayout({ documentType: "COLLECTOR", report, layout })

    expect(full).toContain(ticketLayout.bodyText)
    expect(body).toContain("03/06/2026")
    expect(body).toContain("TOTAL CASH")
    expect(body).toContain("120.00")
    expect(full).toContain("Phone No")
    expect(full).toContain("Collector:")
    expect(full).toContain("001")
  })
})
