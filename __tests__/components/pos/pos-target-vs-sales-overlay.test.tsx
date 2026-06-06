/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import {
  PosTargetVsSalesOverlay,
  formatBranchTitle,
} from "@/components/pos/PosTargetVsSalesOverlay"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const sampleSummary = {
  branchCode: "SH001",
  monthLabel: "June 2026",
  today: { target: "9000.00", actual: "8500.00" },
  month: { target: "270000.00", actual: "245000.00", achievementPercent: "90.7" },
  days: [
    {
      dateKey: "2026-06-05",
      day: 5,
      target: "9000.00",
      actual: "8000.00",
      isToday: false,
    },
    {
      dateKey: "2026-06-06",
      day: 6,
      target: "9000.00",
      actual: "8500.00",
      isToday: true,
    },
  ],
}

describe("formatBranchTitle", () => {
  it("combines code and name", () => {
    expect(formatBranchTitle("SH001", "Chidlom")).toBe("SH001 • Chidlom")
  })
})

describe("PosTargetVsSalesOverlay", () => {
  beforeEach(() => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => sampleSummary,
    })) as typeof fetch
  })

  it("shows branch title, right-aligned summary values, and calendar without drill-down", async () => {
    const onClose = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosTargetVsSalesOverlay
          onClose={onClose}
          branchCode="SH001"
          branchName="Chidlom"
        />
      )
    })

    await act(async () => {
      await Promise.resolve()
    })

    const branchTitle = container.querySelector(
      '[data-testid="pos-target-vs-sales-branch-title"]'
    )
    expect(branchTitle?.textContent).toContain("SH001 • Chidlom")

    expect(container.textContent).toContain("Today Target")
    expect(container.textContent).toContain("Achievement %")
    expect(container.textContent).toContain("9,000")
    expect(container.textContent).toContain("90.7%")

    const todayActual = container.querySelector('[data-testid="pos-tvs-today-actual"]')
    expect(todayActual?.className).toContain("text-right")
    expect(todayActual?.className).toContain("text-emerald-400")

    const calendarCellT = container.querySelector('[data-testid="pos-tvs-cell-t-2026-06-06"]')
    expect(calendarCellT?.className).toContain("justify-between")
    const calendarCellA = container.querySelector('[data-testid="pos-tvs-cell-a-2026-06-06"]')
    expect(calendarCellA?.className).toContain("justify-between")

    expect(container.querySelector('[data-testid="pos-target-vs-sales-calendar"]')).not.toBeNull()
    expect(container.querySelector("button[data-testid^='actual-line-']")).toBeNull()
    expect(container.textContent).not.toContain("/shop/target-sales")

    const panel = container.querySelector('[data-testid="pos-target-vs-sales-panel"]')
    expect(panel?.className).not.toContain("h-[min(96vh")
    expect(panel?.className).not.toContain("flex-1")

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("closes on Escape and Exit", async () => {
    const onClose = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosTargetVsSalesOverlay
          onClose={onClose}
          branchCode="SH001"
          branchName="Chidlom"
        />
      )
    })

    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })
    expect(onClose).toHaveBeenCalledTimes(1)

    onClose.mockClear()
    act(() => {
      root.render(
        <PosTargetVsSalesOverlay
          onClose={onClose}
          branchCode="SH001"
          branchName="Chidlom"
        />
      )
    })
    await act(async () => {
      await Promise.resolve()
    })

    const exitBtn = container.querySelector('[data-testid="pos-target-vs-sales-exit"]')
    act(() => {
      ;(exitBtn as HTMLButtonElement).click()
    })
    expect(onClose).toHaveBeenCalledTimes(1)

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("shows em dash when target is missing", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({
        ...sampleSummary,
        today: { target: null, actual: "8500.00" },
        month: { target: null, actual: "245000.00", achievementPercent: null },
        days: sampleSummary.days.map((d) => ({ ...d, target: null })),
      }),
    })) as typeof fetch

    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosTargetVsSalesOverlay
          onClose={() => {}}
          branchCode="SH001"
          branchName="Chidlom"
        />
      )
    })

    await act(async () => {
      await Promise.resolve()
    })

    const todayTarget = container.querySelector('[data-testid="pos-tvs-today-target"]')
    expect(todayTarget?.textContent).toBe("—")

    act(() => root.unmount())
    document.body.removeChild(container)
  })
})
