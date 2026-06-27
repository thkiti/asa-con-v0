/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ReadZTodayWorkspace } from "@/components/pos/ReadZTodayWorkspace"
import { ReadZLookupWorkspace } from "@/components/pos/ReadZLookupWorkspace"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import { READ_Z_LOOKUP_EMPTY_MESSAGE } from "@/lib/pos-ui/read-z-lookup-display"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const baseReport: ReadReportPayload = {
  mode: "Z",
  bangkokDate: "2026-06-27",
  readZScope: "daily",
  readZViewDate: "2026-06-27",
  readZReview: true,
  generatedAt: "2026-06-27T10:00:00.000Z",
  staffId: "103",
  staffName: "Staff",
  branchCode: "SH001",
  branchName: "Chidlom",
  groupLines: [],
  paymentLines: [],
  grandTotal: 100,
  saleCount: 2,
  refundCount: 0,
  refundTotal: 0,
  netTotal: 100,
}

describe("ReadZTodayWorkspace", () => {
  it("shows ticket and print without lookup controls", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <ReadZTodayWorkspace
          report={baseReport}
          readZLayout={DEFAULT_THERMAL_LAYOUTS.READ_Z}
          onClose={jest.fn()}
          onPrintReport={jest.fn()}
        />
      )
    })

    expect(container.querySelector('[data-testid="pos-read-z-today-workspace"]')).not.toBeNull()
    expect(container.querySelector(".readZLookupControlRow")).toBeNull()
    expect(container.querySelector(".readZTicketCard")).not.toBeNull()
    expect(container.textContent).toContain("PRINT REPORT AND EXIT")

    act(() => root.unmount())
  })
})

describe("ReadZLookupWorkspace", () => {
  it("shows lookup controls and loading state", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <ReadZLookupWorkspace
          selectedDate="2026-06-27"
          lookupMode="daily"
          report={null}
          readZLayout={DEFAULT_THERMAL_LAYOUTS.READ_Z}
          onClose={jest.fn()}
          reviewLoading
          onDateSelect={jest.fn()}
          onCumulativePress={jest.fn()}
        />
      )
    })

    expect(container.querySelector('[data-testid="pos-read-z-lookup-workspace"]')).not.toBeNull()
    expect(container.querySelector(".readZLookupControlRow")).not.toBeNull()
    expect(container.querySelector('[data-testid="pos-read-z-lookup-loading"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="pos-read-z-print-report-button"]')).toBeNull()

    act(() => root.unmount())
  })

  it("shows empty state for daily date with no ticket", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <ReadZLookupWorkspace
          selectedDate="2026-06-27"
          lookupMode="daily"
          report={{ ...baseReport, saleCount: 0, grandTotal: 0, netTotal: 0 }}
          readZLayout={DEFAULT_THERMAL_LAYOUTS.READ_Z}
          onClose={jest.fn()}
          onDateSelect={jest.fn()}
          onCumulativePress={jest.fn()}
        />
      )
    })

    expect(container.querySelector('[data-testid="pos-read-z-lookup-empty"]')).not.toBeNull()
    expect(container.textContent).toContain(READ_Z_LOOKUP_EMPTY_MESSAGE)
    expect(container.querySelector(".readZTicketCard")).toBeNull()

    act(() => root.unmount())
  })

  it("shows ticket and optional print when daily report has activity", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <ReadZLookupWorkspace
          selectedDate="2026-06-27"
          lookupMode="daily"
          report={baseReport}
          readZLayout={DEFAULT_THERMAL_LAYOUTS.READ_Z}
          onClose={jest.fn()}
          onDateSelect={jest.fn()}
          onCumulativePress={jest.fn()}
          printAllowed
          onPrintReport={jest.fn()}
        />
      )
    })

    expect(container.querySelector(".readZTicketCard")).not.toBeNull()
    expect(container.querySelector('[data-testid="pos-read-z-print-report-button"]')).not.toBeNull()
    expect(container.textContent).toContain("PRINT REPORT")

    act(() => root.unmount())
  })
})
