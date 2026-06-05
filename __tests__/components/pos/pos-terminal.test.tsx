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
      if (url === "/api/pos/receipt-no/preview") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ receiptNo: "REC-SH001-202606-0001", preview: true }),
        } as Response)
      }
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
      if (url === "/api/pos/checkout" && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            sale: {
              id: "sale-checkout-1",
              branchId: "b1",
              staffId: "S001",
              total: "25.00",
              createdAt: new Date().toISOString(),
            },
            items: [],
            payment: {
              id: "pay-1",
              method: "CASH",
              amount: "25.00",
              change: "0.00",
            },
            receipt: {
              id: "r1",
              receiptNo: "R-test-20260101-0001",
              issuedAt: new Date().toISOString(),
            },
            ledger: { applied: 0, skippedZeroQty: 0 },
          }),
        } as Response)
      }
      if (url.startsWith("/api/pos/products/lookup")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            product: {
              productId: "p1",
              code: "0101001",
              name: "Test Product",
              unitPrice: "25.00",
              priceSource: "SELLING",
            },
          }),
        } as Response)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    }) as typeof fetch
  })

  it("renders session banner and receipt panel header from session API", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    expect(container.textContent).toContain("Branch:")
    expect(container.textContent).toContain("SH001 • Chidlom")
    expect(container.textContent).toContain("Staff:")
    expect(container.textContent).toContain("103 • Somsak Kamnuch")
    expect(container.textContent).toContain("Receipt:")
    expect(container.textContent).toContain("REC-SH001-202606-0001")
    expect(container.textContent).toContain("ASA • POS TERMINAL")
    expect(container.textContent).not.toContain("Staff ID")
    expect(container.textContent).not.toContain("Branch code")

    act(() => root.unmount())
  })

  it("shows latest receipt number on orange panel after checkout until new sale", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    await checkoutOneItem(container)

    expect(container.textContent).toContain("R-test-20260101-0001")

    const skipPrintBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("New Sale without print")
    )
    act(() => {
      skipPrintBtn!.click()
    })
    await flushPromises()

    expect(container.textContent).toContain("REC-SH001-202606-0001")

    act(() => root.unmount())
  })

  it("does not show bottom Stock documents link", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    expect(container.textContent).not.toContain("Stock documents")

    act(() => root.unmount())
  })

  it("shows REFUND button instead of ORDER", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    expect(container.textContent).toContain("REFUND")
    expect(container.textContent).not.toContain("ORDER")

    act(() => root.unmount())
  })

  it("navigates STOCK COUNT to stock documents list", async () => {
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
    expect(push).toHaveBeenCalledWith("/shop/stock-documents")

    act(() => root.unmount())
  })

  it("opens refund overlay without GOODWILL option", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    const refundBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "REFUND"
    )
    act(() => {
      refundBtn!.click()
    })
    await flushPromises()

    expect(container.textContent).toContain("Enter the original sale receipt number")
    expect(container.textContent).not.toContain("GOODWILL")

    act(() => root.unmount())
  })

  it("successful refund POST opens refund receipt print", async () => {
    const openSpy = jest.spyOn(window, "open").mockImplementation(() => null)
    const fetchMock = global.fetch as jest.Mock
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === "/api/pos/receipt-no/preview") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ receiptNo: "REC-SH001-202606-0001", preview: true }),
        } as Response)
      }
      if (url === "/api/auth/session") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ user: sampleUser }),
        } as Response)
      }
      if (url.startsWith("/api/pos/refund/preview")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            saleId: "sale-refund-1",
            saleTotal: "100.00",
            refundedTotal: "0.00",
            remainingRefundable: "100.00",
            originalReceiptId: "rcpt-1",
            originalReceiptNo: "REC-SH001-202606-0001",
          }),
        } as Response)
      }
      if (url === "/api/pos/refund" && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            refund: {
              id: "refund-pos-1",
              refundNo: "REF-SH001-202606-0001",
              amount: "50.00",
            },
          }),
        } as Response)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    const refundBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "REFUND"
    )
    act(() => {
      refundBtn!.click()
    })
    await flushPromises()

    const receiptInput = container.querySelector(
      'input[aria-label="Original receipt number"]'
    ) as HTMLInputElement
    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      nativeSetter?.call(receiptInput, "REC-SH001-202606-0001")
      receiptInput.dispatchEvent(new Event("input", { bubbles: true }))
    })

    const lookupBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Look up receipt")
    )
    act(() => {
      lookupBtn!.click()
    })
    await flushPromises()
    await flushPromises()

    const amountInput = container.querySelector(
      'input[aria-label="Refund amount"]'
    ) as HTMLInputElement
    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      nativeSetter?.call(amountInput, "50.00")
      amountInput.dispatchEvent(new Event("input", { bubbles: true }))
    })

    const processBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Process refund")
    )
    act(() => {
      processBtn!.click()
    })
    await flushPromises()
    await flushPromises()

    expect(openSpy).toHaveBeenCalledWith(
      "/shop/refund-receipt/refund-pos-1?autoprint=1",
      "_blank"
    )
    expect(container.textContent).toContain("Refund complete")
    expect(container.textContent).toContain("REF-SH001-202606-0001")

    const refundPost = fetchMock.mock.calls.find(
      ([url, init]) => String(url) === "/api/pos/refund" && init?.method === "POST"
    )
    expect(refundPost).toBeDefined()
    expect(JSON.parse(String(refundPost?.[1]?.body))).toEqual({
      saleId: "sale-refund-1",
      amount: "50.00",
    })

    openSpy.mockRestore()
    act(() => root.unmount())
  })

  it("adds product to cart on barcode Enter without checkout API", async () => {
    const fetchMock = global.fetch as jest.Mock
    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    const input = container.querySelector(
      'input[aria-label="Barcode scan input"]'
    ) as HTMLInputElement
    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      nativeSetter?.call(input, "1010015")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      )
    })
    await flushPromises()
    await flushPromises()

    expect(container.textContent).toContain("Test Product")
    expect(container.textContent).toContain("25.00")
    const checkoutCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/api/pos/checkout")
    )
    expect(checkoutCalls).toHaveLength(0)
    const lookupCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).startsWith("/api/pos/products/lookup")
    )
    expect(lookupCalls.length).toBeGreaterThan(0)

    act(() => root.unmount())
  })

  async function checkoutOneItem(container: HTMLElement): Promise<void> {
    const input = container.querySelector(
      'input[aria-label="Barcode scan input"]'
    ) as HTMLInputElement
    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      nativeSetter?.call(input, "1010015")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      )
    })
    await flushPromises()
    await flushPromises()

    const checkoutBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "CHECKOUT"
    )
    act(() => {
      checkoutBtn!.click()
    })
    await flushPromises()

    const payBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Pay CASH"
    )
    act(() => {
      payBtn!.click()
    })
    await flushPromises()
    await flushPromises()
  }

  it("print receipt and new sale opens autoprint and resets POS immediately", async () => {
    const openSpy = jest.spyOn(window, "open").mockImplementation(() => null)
    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    await checkoutOneItem(container)

    expect(container.textContent).toContain("Sale complete")
    expect(container.textContent).toContain("Print Receipt & New Sale")

    const printBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Print Receipt") && b.textContent?.includes("New Sale")
    )
    act(() => {
      printBtn!.click()
    })
    await flushPromises()

    expect(openSpy).toHaveBeenCalledWith(
      "/shop/receipt/sale-checkout-1?autoprint=1",
      "_blank"
    )
    expect(container.textContent).not.toContain("Sale complete")
    expect(container.textContent).toContain("Scan a product to add to cart")
    expect(container.textContent).not.toContain("Test Product")

    openSpy.mockRestore()
    act(() => root.unmount())
  })

  it("new sale without print resets POS without opening receipt window", async () => {
    const openSpy = jest.spyOn(window, "open").mockImplementation(() => null)
    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    await checkoutOneItem(container)

    const skipPrintBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("New Sale without print")
    )
    act(() => {
      skipPrintBtn!.click()
    })
    await flushPromises()

    expect(openSpy).not.toHaveBeenCalled()
    expect(container.textContent).toContain("Scan a product to add to cart")
    expect(container.textContent).not.toContain("Sale complete")

    openSpy.mockRestore()
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
