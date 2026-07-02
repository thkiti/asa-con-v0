import {
  formatTraceNodeDate,
  formatTraceNodeStatus,
} from "@/lib/finance-ui/document-trace-node-display"

describe("document trace node display", () => {
  it("formats status labels for compact trace lines", () => {
    expect(formatTraceNodeStatus("COMPLETED")).toBe("Completed")
    expect(formatTraceNodeStatus("POSTED_TO_GL")).toBe("Posted To Gl")
    expect(formatTraceNodeStatus("")).toBe("—")
  })

  it("formats trace dates as dd.mm.yyyy", () => {
    expect(formatTraceNodeDate("2026-01-02T10:00:00.000Z")).toBe("02.01.2026")
    expect(formatTraceNodeDate(null)).toBeNull()
  })
})
