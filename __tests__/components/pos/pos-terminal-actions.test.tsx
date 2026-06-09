/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosTerminalPage } from "@/components/pos/PosTerminalPage"
import type { SessionUserApi } from "@/lib/auth/session-user-api"

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
}

const push = jest.fn()
const replace = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    replace,
    refresh: jest.fn(),
  }),
}))

jest.mock("@/lib/pos-ui/payment-evidence-pending-client", () => ({
  fetchPendingPaymentEvidence: jest.fn(async () => ({
    ok: true,
    result: { count: 0, receipts: [] },
  })),
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
  const buttons = Array.from(container.querySelectorAll("button"))
  const btn = buttons.find((b) => b.textContent?.includes(label))
  expect(btn).toBeTruthy()
  act(() => {
    btn!.click()
  })
}

describe("PosTerminalPage action wiring", () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
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
      if (url.includes("/api/auth/session")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ user: sampleUser }),
        })
      }
      if (url.includes("/api/pos/receipt-no/preview")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ receiptNo: "REC-SH001-202606-0001" }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  })

  it("opens collector overlay when COLLECTOR is pressed", async () => {
    const { container } = renderPosTerminal()
    await flushPromises()

    clickKeypadButton(container, "COLLECTOR")
    await flushPromises()

    expect(container.textContent).toContain("COLLECTOR — เก็บยอดจาก Cash Register")
  })

  it("opens repair ticket overlay when REPAIR TICKET is pressed", async () => {
    const { container } = renderPosTerminal()
    await flushPromises()

    clickKeypadButton(container, "REPAIR")
    await flushPromises()

    expect(container.textContent).toContain("REPAIR TICKET — ตั๋วรับซ่อม")
  })

  it("opens read credential gate for READ X", async () => {
    const { container } = renderPosTerminal()
    await flushPromises()

    clickKeypadButton(container, "READ X")
    await flushPromises()

    expect(container.textContent).toContain("READ X รายงานการขาย")
  })
})
