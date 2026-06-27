import { buildReadZSlipInfoBlock } from "@/lib/thermal/build-read-z-info-block"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

const baseReport: ReadReportPayload = {
  mode: "Z",
  bangkokDate: "2026-06-27",
  readZScope: "daily",
  readZViewDate: "2026-06-27",
  generatedAt: "2026-06-27T10:00:00.000Z",
  staffId: "103",
  staffName: "Staff",
  branchCode: "SH001",
  branchName: "Chidlom",
  groupLines: [],
  paymentLines: [],
  grandTotal: 0,
  saleCount: 0,
  refundCount: 0,
  refundTotal: 0,
  netTotal: 0,
}

describe("buildReadZSlipInfoBlock", () => {
  it("returns empty rows for today's default daily READ Z", () => {
    expect(buildReadZSlipInfoBlock(baseReport, "2026-06-27")).toEqual([])
  })

  it("shows business date for historical daily review", () => {
    const rows = buildReadZSlipInfoBlock(
      { ...baseReport, readZViewDate: "2026-06-20" },
      "2026-06-27"
    )
    expect(rows).toEqual([
      { kind: "label-value", label: "Business date:", value: "20/06/2026" },
      { kind: "blank" },
    ])
  })

  it("shows business date for lookup review on today", () => {
    const rows = buildReadZSlipInfoBlock(
      { ...baseReport, readZReview: true },
      "2026-06-27"
    )
    expect(rows).toEqual([
      { kind: "label-value", label: "Business date:", value: "27/06/2026" },
      { kind: "blank" },
    ])
  })

  it("shows cumulative to-date label and period", () => {
    const rows = buildReadZSlipInfoBlock(
      {
        ...baseReport,
        readZScope: "cumulative-to-date",
        readZViewDate: "2026-06-27",
        bangkokDateFrom: "2026-06-01",
        bangkokDateTo: "2026-06-27",
        bangkokDate: "2026-06-01 – 2026-06-27",
      },
      "2026-06-27"
    )
    expect(rows).toEqual([
      { kind: "label-value", label: "Report:", value: "Cumulative To-Date" },
      {
        kind: "label-value",
        label: "Period:",
        value: "01/06/2026 - 27/06/2026",
      },
      { kind: "blank" },
    ])
  })

  it("does not collapse cumulative period when readZViewDate is month start", () => {
    const rows = buildReadZSlipInfoBlock(
      {
        ...baseReport,
        readZScope: "cumulative-to-date",
        readZViewDate: "2026-06-01",
        bangkokDateFrom: "2026-06-01",
        bangkokDateTo: "2026-06-27",
        bangkokDate: "2026-06-01 – 2026-06-27",
      },
      "2026-06-27"
    )
    expect(rows[1]).toEqual({
      kind: "label-value",
      label: "Period:",
      value: "01/06/2026 - 27/06/2026",
    })
  })
})
