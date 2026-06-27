/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosTerminalPage } from "@/components/pos/PosTerminalPage"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import type { FetchSessionResult } from "@/lib/pos-ui/session-client"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const sampleUser: SessionUserApi = {
  userId: "u1",
  staffId: "103",
  name: "Somsak Kamnuch",
  role: "SH_STAFF",
  branchId: "b1",
  branchCode: "SH001",
  branchName: "Chidlom",
  documentEntityCode: "AS",
}

const mockFetchSessionUser = jest.fn<Promise<FetchSessionResult>, []>()

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}))

jest.mock("@/lib/pos-ui/session-client", () => ({
  fetchSessionUser: () => mockFetchSessionUser(),
}))

jest.mock("@/components/pos/PosTerminalLiveClock", () => ({
  PosTerminalLiveClock: () => <div data-testid="pos-terminal-live-clock" />,
}))

jest.mock("@/lib/pos-ui/pos-thermal-layouts-client", () => {
  const { DEFAULT_THERMAL_LAYOUTS } = require("@/lib/thermal/layout-defaults")
  const { resolveThermalLayout } = require("@/lib/thermal/layout")
  const resolved = Object.fromEntries(
    (Object.keys(DEFAULT_THERMAL_LAYOUTS) as Array<keyof typeof DEFAULT_THERMAL_LAYOUTS>).map(
      (type) => [type, resolveThermalLayout(type, DEFAULT_THERMAL_LAYOUTS)]
    )
  )
  return {
    defaultResolvedThermalLayouts: () => resolved,
    fetchPosThermalLayouts: jest.fn(async () => ({ resolved })),
  }
})

jest.mock("@/lib/pos-ui/payment-evidence-pending-client", () => ({
  fetchPendingPaymentEvidence: jest.fn(async () => ({
    ok: true,
    result: { count: 0, receipts: [] },
  })),
}))

jest.mock("@/lib/pos-ui/staff-evidence-client", () => ({
  fetchStaffEvidenceStatus: jest.fn(async () => ({ evidenceComplete: true })),
  submitStaffEvidenceCapture: jest.fn(),
}))

const GHOST_SURFACE = "bg-zinc-400/30"

function renderPosTerminal(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<PosTerminalPage />)
  })
  return { container, root }
}

async function flushPromises(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

function clickKeypadButton(container: HTMLElement, label: string) {
  const btn = findLabeledKeypadButton(container, label)
  expect(btn).toBeTruthy()
  act(() => {
    btn!.click()
  })
}

function findLabeledKeypadButton(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll("button")).find((b) => {
    if (b.getAttribute("aria-hidden")) return false
    if (b.className.includes(GHOST_SURFACE)) return false
    const text = b.textContent ?? ""
    if (label === "STOCK COUNT") {
      return text.includes("STOCK") && text.includes("COUNT")
    }
    if (label === "REPAIR") {
      return text.includes("REPAIR")
    }
    return text.includes(label)
  })
}

function expectWorkflowBlanksExcept(
  container: HTMLElement,
  activeLabel: string
) {
  const workflowLabels = [
    "READ X",
    "READ Z",
    "REFUND",
    "LOOKUP",
    "COLLECTOR",
    "ORDER",
    "STOCK COUNT",
    "REPAIR",
  ]

  for (const label of workflowLabels) {
    const visible = findLabeledKeypadButton(container, label)
    if (label === activeLabel || (activeLabel === "REPAIR" && label === "REPAIR")) {
      expect(visible).toBeTruthy()
    } else {
      expect(visible).toBeFalsy()
    }
  }
}

function expectNormalKeypadRestored(container: HTMLElement) {
  for (const label of ["READ X", "READ Z", "REFUND", "LOOKUP", "COLLECTOR", "ORDER"]) {
    expect(findLabeledKeypadButton(container, label)).toBeTruthy()
  }
  expect(container.querySelectorAll('[data-testid="pos-keypad-numeric-blank"]').length).toBe(0)
  expect(findLabeledKeypadButton(container, "1")).toBeTruthy()
}

describe("POS workspace keypad active-state", () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    document.body.innerHTML = ""
    fetchMock.mockClear()
    mockFetchSessionUser.mockResolvedValue({ ok: true, user: sampleUser })
    window.alert = jest.fn()
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{ stop: jest.fn() }],
        }),
      },
    })
    global.fetch = fetchMock as unknown as typeof fetch
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/api/pos/receipt-no/preview")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ receiptNo: "REC-SH001-202606-0001" }),
        })
      }
      if (url.includes("/api/pos/refunds/refundable")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ receipts: [] }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  })

  it("READ X active blanks other workflow buttons", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()

    clickKeypadButton(container, "READ X")
    await flushPromises()

    expectWorkflowBlanksExcept(container, "READ X")

    act(() => root.unmount())
  })

  it("READ Z active blanks other workflow buttons", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()

    clickKeypadButton(container, "READ Z")
    await flushPromises()

    expectWorkflowBlanksExcept(container, "READ Z")

    act(() => root.unmount())
  })

  it("REFUND active blanks other workflow buttons", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()

    clickKeypadButton(container, "REFUND")
    await flushPromises()

    expectWorkflowBlanksExcept(container, "REFUND")

    act(() => root.unmount())
  })

  it("COLLECTOR active blanks other workflow buttons", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()

    clickKeypadButton(container, "COLLECTOR")
    await flushPromises()

    expectWorkflowBlanksExcept(container, "COLLECTOR")

    act(() => root.unmount())
  })

  it("LOOKUP active blanks other workflow buttons", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()

    clickKeypadButton(container, "LOOKUP")
    await flushPromises()

    expectWorkflowBlanksExcept(container, "LOOKUP")

    act(() => root.unmount())
  })

  it("X/Exit restores normal keypad after closing LOOKUP workspace", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()

    clickKeypadButton(container, "LOOKUP")
    await flushPromises()

    const closeBtn = container.querySelector(
      '[data-testid="pos-receipt-lookup-close"]'
    ) as HTMLButtonElement
    act(() => {
      closeBtn.click()
    })
    await flushPromises()

    expectNormalKeypadRestored(container)

    act(() => root.unmount())
  })

  it("cancel restores normal keypad after closing READ X credential gate", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()

    clickKeypadButton(container, "READ X")
    await flushPromises()

    const cancelBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "ยกเลิก"
    )
    expect(cancelBtn).toBeTruthy()
    act(() => {
      cancelBtn!.click()
    })
    await flushPromises()

    expectNormalKeypadRestored(container)

    act(() => root.unmount())
  })
})
