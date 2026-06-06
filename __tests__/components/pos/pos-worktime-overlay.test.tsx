/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosWorktimeOverlay } from "@/components/pos/PosWorktimeOverlay"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const sampleView = {
  branchCode: "SH001",
  monthLabel: "June 2026",
  summary: { workDays: 2, totalHours: "08:30:00", incompleteDays: 1 },
  days: [
    {
      dateKey: "2026-06-05",
      day: 5,
      clockIn: "09:00:00",
      clockOut: "17:30:00",
      isToday: false,
    },
    {
      dateKey: "2026-06-06",
      day: 6,
      clockIn: "09:15:00",
      clockOut: null,
      isToday: true,
    },
  ],
}

describe("PosWorktimeOverlay", () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === "/api/pos/worktime") {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => sampleView,
        } as Response
      }
      if (url === "/api/pos/worktime/in" && init?.method === "POST") {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => ({
            ...sampleView,
            days: sampleView.days.map((d) =>
              d.isToday ? { ...d, clockIn: "09:20:33" } : d
            ),
          }),
        } as Response
      }
      if (url === "/api/pos/worktime/out" && init?.method === "POST") {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => sampleView,
        } as Response
      }
      throw new Error(`Unexpected fetch: ${url}`)
    }) as typeof fetch
  })

  it("shows header actions, three summary cards only, and HH:mm:ss calendar", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosWorktimeOverlay
          onClose={() => {}}
          branchCode="SH001"
          branchName="Chidlom"
        />
      )
    })

    await act(async () => {
      await Promise.resolve()
    })

    const header = container.querySelector("header")
    const actions = container.querySelector('[data-testid="pos-worktime-actions"]')
    expect(header?.contains(actions!)).toBe(true)
    expect(container.querySelector('[data-testid="pos-worktime-in-btn"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="pos-worktime-out-btn"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="pos-worktime-exit"]')).not.toBeNull()

    const summary = container.querySelector('[data-testid="pos-worktime-summary"]')
    expect(summary).not.toBeNull()
    expect(summary?.contains(actions!)).toBe(false)
    expect(summary?.querySelectorAll("button").length).toBe(0)
    expect(summary?.children.length).toBe(3)
    expect(container.textContent).toContain("08:30:00 ชั่วโมง")

    expect(
      container.querySelector('[data-testid="pos-worktime-in-2026-06-06"]')?.textContent
    ).toContain("09:15:00")

    const calendar = container.querySelector('[data-testid="pos-worktime-calendar"]')
    expect(calendar).not.toBeNull()
    expect(summary?.nextElementSibling).toBe(calendar)
    expect(container.querySelector("footer")).toBeNull()

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("IN button posts clock-in with seconds and Exit closes overlay", async () => {
    const onClose = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosWorktimeOverlay
          onClose={onClose}
          branchCode="SH001"
          branchName="Chidlom"
        />
      )
    })

    await act(async () => {
      await Promise.resolve()
    })

    const inBtn = container.querySelector('[data-testid="pos-worktime-in-btn"]')
    await act(async () => {
      ;(inBtn as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(global.fetch).toHaveBeenCalledWith("/api/pos/worktime/in", {
      method: "POST",
    })
    expect(
      container.querySelector('[data-testid="pos-worktime-in-2026-06-06"]')?.textContent
    ).toContain("09:20:33")

    const exitBtn = container.querySelector('[data-testid="pos-worktime-exit"]')
    act(() => {
      ;(exitBtn as HTMLButtonElement).click()
    })
    expect(onClose).toHaveBeenCalled()

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("closes on Escape", async () => {
    const onClose = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    act(() => {
      root.render(
        <PosWorktimeOverlay onClose={onClose} branchCode="SH001" branchName="Chidlom" />
      )
    })

    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })

    expect(onClose).toHaveBeenCalled()

    act(() => root.unmount())
    document.body.removeChild(container)
  })
})
