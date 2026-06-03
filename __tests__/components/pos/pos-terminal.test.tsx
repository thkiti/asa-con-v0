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
  staffId: "S001",
  name: "Branch Staff",
  role: "SH_STAFF",
  branchId: "b1",
  branchCode: "SH01",
  branchName: "Shop One",
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

describe("PosTerminalPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === "/api/auth/session") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ user: sampleUser }),
        } as Response)
      }
      if (url === "/api/auth/logout" && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ redirectTo: "/login" }),
        } as Response)
      }
      if (url === "/api/pos/checkout") {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({}),
        })
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    }) as typeof fetch
  })

  it("renders session banner fields from session API", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    expect(container.textContent).toContain("SH01")
    expect(container.textContent).toContain("Shop One")
    expect(container.textContent).toContain("S001")
    expect(container.textContent).toContain("Branch Staff")
    expect(container.textContent).toContain("ASA • POS TERMINAL")

    act(() => root.unmount())
  })

  it("navigates ORDER to transfer out with from=shop", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    const orderBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "ORDER"
    )
    expect(orderBtn).toBeDefined()
    act(() => {
      orderBtn!.click()
    })
    expect(push).toHaveBeenCalledWith(
      "/shop/stock-documents/new?type=TRANSFER_OUT&from=shop"
    )

    act(() => root.unmount())
  })

  it("navigates STOCK COUNT to adjustment with from=shop", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    const stockBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("STOCK") && b.textContent?.includes("COUNT")
    )
    expect(stockBtn).toBeDefined()
    act(() => {
      stockBtn!.click()
    })
    expect(push).toHaveBeenCalledWith(
      "/shop/stock-documents/new?type=ADJUSTMENT&from=shop"
    )

    act(() => root.unmount())
  })

  it("opens checkout placeholder without calling checkout API", async () => {
    const fetchMock = global.fetch as jest.Mock
    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    const checkoutBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "CHECKOUT"
    )
    act(() => {
      checkoutBtn!.click()
    })

    expect(container.textContent).toContain("Phase 3")
    const checkoutCalls = fetchMock.mock.calls.filter(
      ([url]) => String(url) === "/api/pos/checkout"
    )
    expect(checkoutCalls).toHaveLength(0)

    act(() => root.unmount())
  })

  it("logout posts to auth logout", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    const logoutBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "LOGOUT"
    )
    act(() => {
      logoutBtn!.click()
    })
    await flushPromises()

    expect(push).toHaveBeenCalledWith("/login")

    act(() => root.unmount())
  })
})
