/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { SalesTargetSetupPage } from "@/components/shop/SalesTargetSetupPage"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import {
  fetchSalesTarget,
  saveSalesTarget,
} from "@/lib/shop-ui/sales-targets-client"

jest.mock("@/lib/shop-ui/sales-targets-client", () => ({
  fetchSalesTargetBranches: jest.fn().mockResolvedValue({
    ok: true,
    branches: [{ id: "b1", code: "SH001", name: "Shop One" }],
  }),
  fetchSalesTarget: jest.fn().mockResolvedValue({
    ok: true,
    target: {
      branchId: "b1",
      year: 2026,
      month: 6,
      monthlyTotal: "270000.00",
      weekPattern: [1, 1, 1, 1, 1, 1, 1],
      exists: false,
    },
  }),
  fetchSalesTargetPreview: jest.fn().mockResolvedValue({
    ok: true,
    days: [
      {
        dateKey: "2026-06-01",
        weekday: "Mon",
        target: "12500.00",
      },
    ],
    dailySum: "270000.00",
    monthlyTotal: "270000.00",
  }),
  fetchPreviousMonthSalesTarget: jest.fn(),
  saveSalesTarget: jest.fn().mockResolvedValue({
    ok: true,
    target: {
      branchId: "b1",
      year: 2026,
      month: 6,
      monthlyTotal: "270000.00",
      weekPattern: [0.8, 1, 1, 1, 1, 1, 1],
      exists: true,
    },
  }),
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const hoAdmin: SessionUserApi = {
  userId: "u1",
  staffId: "001",
  name: "Admin",
  role: "HO_ADMIN",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "HO",
}

const mockedSave = saveSalesTarget as jest.MockedFunction<typeof saveSalesTarget>
const mockedFetchTarget = fetchSalesTarget as jest.MockedFunction<
  typeof fetchSalesTarget
>

async function flushEffects(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 300))
  })
}

describe("SalesTargetSetupPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("uses text decimal inputs for monthly target and week pattern", () => {
    const html = renderToStaticMarkup(
      <SalesTargetSetupPage user={hoAdmin} canEdit={true} />
    )
    expect(html).toContain('inputMode="decimal"')
    expect(html).toContain("appearance:textfield")
    expect(html).toContain("webkit-outer-spin-button")
  })

  it("uses compact header row: branch flex, narrow month, Target label inline", () => {
    const html = renderToStaticMarkup(
      <SalesTargetSetupPage user={hoAdmin} canEdit={true} />
    )
    expect(html).toContain('aria-label="Branch"')
    expect(html).toContain('data-testid="sales-target-header-row"')
    expect(html).toContain('data-testid="sales-target-month-select"')
    expect(html).toContain('data-testid="sales-target-amount-field"')
    expect(html).toContain(">Target<")
    expect(html).toContain("sm:grid-cols-[minmax(0,1fr)_4.25rem_3rem_minmax(10rem,14rem)]")
    expect(html).toContain("h-9")
    expect(html).toContain("sales-target-header-control")
    expect(html).not.toContain("Month 6")
    expect(html).not.toContain('placeholder="Monthly target (THB)"')
    expect(html).toContain('aria-label="Sun weight"')
    expect(html).not.toContain("No target saved yet")
    expect(html).not.toContain("Daily sum")
  })

  it("shows action buttons above calendar without status clutter", () => {
    const html = renderToStaticMarkup(
      <SalesTargetSetupPage user={hoAdmin} canEdit={true} />
    )
    expect(html).toContain(">Save<")
    expect(html).toContain("Copy Previous Month")
    expect(html).toContain("Reload")
    expect(html).toContain('data-testid="sales-target-calendar-preview"')
    expect(html).not.toContain("<table")
  })

  it("displays formatted monthly target and calendar preview after load", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    await act(async () => {
      root.render(<SalesTargetSetupPage user={hoAdmin} canEdit={true} />)
    })
    await flushEffects()

    const monthly = container.querySelector(
      '[data-testid="sales-target-amount-field"] input'
    ) as HTMLInputElement
    expect(monthly.value).toBe("270,000")
    expect(
      container.querySelector('[data-testid="sales-target-calendar-preview"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="calendar-header-Sun"]')
    ).not.toBeNull()
    expect(container.textContent).toContain("12,500")
    expect(container.textContent).not.toContain(">Date<")
  })

  it("shows friendly error instead of raw JavaScript exception text", async () => {
    mockedFetchTarget.mockResolvedValueOnce({
      ok: false,
      status: 500,
      error: "Cannot read properties of undefined (reading 'findUnique')",
    })

    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    await act(async () => {
      root.render(<SalesTargetSetupPage user={hoAdmin} canEdit={true} />)
    })
    await flushEffects()

    const alert = container.querySelector('[data-testid="sales-target-error"]')
    expect(alert?.textContent).toBe("Unable to load sales target. Please reload.")
    expect(container.textContent).not.toContain("findUnique")
  })

  it("shows pattern sum in calendar footer without trailing .0", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    await act(async () => {
      root.render(<SalesTargetSetupPage user={hoAdmin} canEdit={true} />)
    })
    await flushEffects()

    expect(container.textContent).toContain("Sum: 7")
    expect(container.textContent).not.toContain("Sum: 7.00")
  })

  it("Target Enter focuses Sun week pattern input", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    await act(async () => {
      root.render(<SalesTargetSetupPage user={hoAdmin} canEdit={true} />)
    })
    await flushEffects()

    const targetInput = container.querySelector(
      '[data-testid="sales-target-amount-field"] input'
    ) as HTMLInputElement
    const sunInput = container.querySelector(
      '[aria-label="Sun weight"]'
    ) as HTMLInputElement
    const sunFocus = jest.spyOn(sunInput, "focus")

    await act(async () => {
      targetInput.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      )
    })

    expect(sunFocus).toHaveBeenCalled()
    sunFocus.mockRestore()
  })

  it("save sends API payload without commas", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    await act(async () => {
      root.render(<SalesTargetSetupPage user={hoAdmin} canEdit={true} />)
    })
    await flushEffects()

    const saveBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Save"
    )!
    await act(async () => {
      saveBtn.click()
    })
    await flushEffects()

    expect(mockedSave).toHaveBeenCalled()
    const payload = mockedSave.mock.calls[0]![0]
    expect(payload.monthlyTotal).not.toContain(",")
    expect(payload.monthlyTotal).toBe("270000")
  })
})
