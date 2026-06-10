/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosTerminalPage } from "@/components/pos/PosTerminalPage"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { captureVideoFrame } from "@/lib/pos-ui/capture-video-frame"
import { fetchPendingPaymentEvidence } from "@/lib/pos-ui/payment-evidence-pending-client"
import { uploadPaymentEvidenceSlipInBackground } from "@/lib/pos-ui/payment-evidence-upload-client"
import { POS_BANK_TRANSFER_UPLOAD_LATER_LABEL } from "@/lib/pos-ui/pos-payment-methods"

const mockedCapture = captureVideoFrame as jest.MockedFunction<typeof captureVideoFrame>
const mockedPendingEvidence = fetchPendingPaymentEvidence as jest.MockedFunction<
  typeof fetchPendingPaymentEvidence
>
const mockedBackgroundUpload = uploadPaymentEvidenceSlipInBackground as jest.MockedFunction<
  typeof uploadPaymentEvidenceSlipInBackground
>

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

jest.mock("@/lib/pos-ui/capture-video-frame", () => ({
  captureVideoFrame: jest.fn(),
  startCheckoutCameraStream: jest.fn().mockResolvedValue({} as MediaStream),
  stopMediaStream: jest.fn(),
}))

jest.mock("@/lib/pos-ui/payment-evidence-upload-client", () => ({
  uploadPaymentEvidenceSlipInBackground: jest.fn(),
}))

jest.mock("@/lib/pos-ui/stock-count-client", () => ({
  openStockCountDraft: jest.fn(async () => ({
    id: "doc-adj-1",
    refNo: "ADJ-SH001-202606-0001",
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

function mockRefundableReceiptsResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      receipts: [
        {
          receiptNo: "REC-SH001-202606-0001",
          saleId: "sale-refund-1",
          issuedAt: "2026-06-06T14:32:00.000Z",
          total: "100.00",
          alreadyRefunded: "0.00",
          remaining: "100.00",
          cashierDisplay: "103-Somsak Kamnuch",
        },
      ],
    }),
  } as Response
}

function mockTargetVsSalesResponse() {
  return {
    ok: true,
    status: 200,
    headers: { get: () => "application/json" },
    json: async () => ({
      branchCode: "SH001",
      monthLabel: "June 2026",
      today: { target: "9000.00", actual: "8500.00" },
      month: { target: "270000.00", actual: "245000.00", achievementPercent: "90.7" },
      days: [
        {
          dateKey: "2026-06-06",
          day: 6,
          target: "9000.00",
          actual: "8500.00",
          isToday: true,
        },
      ],
    }),
  } as Response
}

function mockWorktimeResponse() {
  return {
    ok: true,
    status: 200,
    headers: { get: () => "application/json" },
    json: async () => ({
      branchCode: "SH001",
      monthLabel: "June 2026",
      summary: { workDays: 1, totalHours: "08:00:00", incompleteDays: 0 },
      days: [
        {
          dateKey: "2026-06-06",
          day: 6,
          clockIn: "09:15:00",
          clockOut: null,
          isToday: true,
        },
      ],
    }),
  } as Response
}

describe("PosTerminalPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedCapture.mockResolvedValue(null)
    mockedPendingEvidence.mockResolvedValue({
      ok: true,
      result: { count: 0, receipts: [] },
    })
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{ stop: jest.fn() }],
        }),
      },
    })
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
        const body = init?.body ? JSON.parse(String(init.body)) : {}
        const paymentMethod = body.paymentMethod ?? "CASH"
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            sale: {
              id: paymentMethod === "BANK_TRANSFER" ? "sale-bank-1" : "sale-checkout-1",
              branchId: "b1",
              staffId: "S001",
              total: "25.00",
              createdAt: new Date().toISOString(),
            },
            items: [],
            payment: {
              id: "pay-1",
              method: paymentMethod,
              amount: "25.00",
              change: "0.00",
            },
            receipt: {
              id: "r1",
              receiptNo:
                paymentMethod === "BANK_TRANSFER"
                  ? "R-test-bank-0001"
                  : "R-test-20260101-0001",
              issuedAt: new Date().toISOString(),
            },
            ledger: { applied: 0, skippedZeroQty: 0 },
          }),
        } as Response)
      }
      if (url === "/api/pos/refund/receipts") {
        return Promise.resolve(mockRefundableReceiptsResponse())
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
      if (url === "/api/pos/target-vs-sales") {
        return Promise.resolve(mockTargetVsSalesResponse())
      }
      if (url === "/api/pos/worktime") {
        return Promise.resolve(mockWorktimeResponse())
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    }) as typeof fetch
  })

  it("opens WorkTime overlay from keypad", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    const worktimeBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("WORKTIME") || b.textContent?.includes("WORK TIME")
    )
    expect(worktimeBtn).toBeDefined()
    act(() => {
      worktimeBtn!.click()
    })
    await flushPromises()
    await flushPromises()
    await flushPromises()

    expect(container.querySelector('[data-testid="pos-worktime-overlay"]')).not.toBeNull()
    expect(container.textContent).toContain("SH001 • Chidlom")
    expect(container.textContent).toContain("จำนวนวันทำงาน")
    expect(container.textContent).not.toContain("Coming in a later POS phase")

    const exitBtn = container.querySelector('[data-testid="pos-worktime-exit"]')
    act(() => {
      ;(exitBtn as HTMLButtonElement).click()
    })
    await flushPromises()

    expect(container.querySelector('[data-testid="pos-worktime-overlay"]')).toBeNull()

    act(() => root.unmount())
  })

  it("opens Target vs Sales overlay with branch summary only", async () => {
    const { container, root } = renderPosTerminal()
    await flushPromises()
    await flushPromises()

    const targetBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("TARGET") && b.textContent?.includes("SALES")
    )
    expect(targetBtn).toBeDefined()
    act(() => {
      targetBtn!.click()
    })
    await flushPromises()
    await flushPromises()
    await flushPromises()

    expect(container.querySelector('[data-testid="pos-target-vs-sales-overlay"]')).not.toBeNull()
    expect(container.textContent).toContain("SH001 • Chidlom")
    expect(container.textContent).toContain("Today Target")
    expect(container.textContent).toContain("Achievement %")
    expect(container.textContent).not.toContain("Coming in a later POS phase")
    expect(container.textContent).not.toContain("/shop/target-sales")
    expect(container.textContent).not.toContain("Recent Sales")
    expect(container.querySelector('[data-testid="pos-target-vs-sales-calendar"]')).not.toBeNull()

    const exitBtn = container.querySelector('[data-testid="pos-target-vs-sales-exit"]')
    act(() => {
      ;(exitBtn as HTMLButtonElement).click()
    })
    await flushPromises()

    expect(container.querySelector('[data-testid="pos-target-vs-sales-overlay"]')).toBeNull()

    act(() => root.unmount())
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

  it("navigates STOCK COUNT to stock count editor draft", async () => {
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
    await flushPromises()
    expect(push).toHaveBeenCalledWith("/shop/stock-documents/doc-adj-1")

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

    expect(container.textContent).toContain("Recent Sales")
    expect(container.textContent).not.toContain("GOODWILL")
    expect(container.textContent?.toLowerCase()).not.toContain("look up receipt")
    expect(container.querySelector('input[aria-label="Manual receipt number"]')).toBeNull()

    const processBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Process refund")
    )
    expect(processBtn?.disabled).toBe(true)

    act(() => root.unmount())
  })

  it("successful refund opens print, closes overlay, and resets form", async () => {
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
            items: [{ name: "KEY BLANK A", qty: 1, lineTotal: "100.00" }],
          }),
        } as Response)
      }
      if (url === "/api/pos/refund/receipts") {
        return Promise.resolve(mockRefundableReceiptsResponse())
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
    }) as typeof fetch

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

    const receiptSelect = container.querySelector(
      'select[aria-label="Recent sales"]'
    ) as HTMLSelectElement
    act(() => {
      receiptSelect.value = "REC-SH001-202606-0001"
      receiptSelect.dispatchEvent(new Event("change", { bubbles: true }))
    })
    await flushPromises()
    await flushPromises()

    const reasonSelect = container.querySelector(
      'select[aria-label="Refund reason"]'
    ) as HTMLSelectElement
    act(() => {
      reasonSelect.value = "KEY_BLANK_MISTAKE"
      reasonSelect.dispatchEvent(new Event("change", { bubbles: true }))
    })

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
    expect(container.textContent).not.toContain("Refund complete")
    expect(container.querySelector('[aria-label="Recent sales"]')).toBeNull()
    expect(container.textContent).toContain("Scan a product to add to cart")

    const refundPost = fetchMock.mock.calls.find(
      ([url, init]) => String(url) === "/api/pos/refund" && init?.method === "POST"
    )
    expect(refundPost).toBeDefined()
    expect(JSON.parse(String(refundPost?.[1]?.body))).toEqual({
      saleId: "sale-refund-1",
      amount: "50.00",
      reasonCode: "KEY_BLANK_MISTAKE",
    })

    act(() => {
      refundBtn!.click()
    })
    await flushPromises()

    const reopenedSelect = container.querySelector(
      'select[aria-label="Recent sales"]'
    ) as HTMLSelectElement
    expect(reopenedSelect?.value).toBe("")
    const reopenedAmount = container.querySelector(
      'input[aria-label="Refund amount"]'
    ) as HTMLInputElement
    expect(reopenedAmount?.value).toBe("")
    const reopenedReason = container.querySelector(
      'select[aria-label="Refund reason"]'
    ) as HTMLSelectElement
    expect(reopenedReason?.value).toBe("")

    openSpy.mockRestore()
    act(() => root.unmount())
  })

  it("failed refund keeps overlay open and preserves entered values", async () => {
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
            items: [{ name: "KEY BLANK A", qty: 1, lineTotal: "100.00" }],
          }),
        } as Response)
      }
      if (url === "/api/pos/refund/receipts") {
        return Promise.resolve(mockRefundableReceiptsResponse())
      }
      if (url === "/api/pos/refund" && init?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({
            error: "Refund amount exceeds remaining refundable balance",
            code: "OVER_REFUND",
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

    const receiptSelect = container.querySelector(
      'select[aria-label="Recent sales"]'
    ) as HTMLSelectElement
    act(() => {
      receiptSelect.value = "REC-SH001-202606-0001"
      receiptSelect.dispatchEvent(new Event("change", { bubbles: true }))
    })
    await flushPromises()
    await flushPromises()

    const reasonSelect = container.querySelector(
      'select[aria-label="Refund reason"]'
    ) as HTMLSelectElement
    act(() => {
      reasonSelect.value = "KEY_BLANK_MISTAKE"
      reasonSelect.dispatchEvent(new Event("change", { bubbles: true }))
    })

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

    expect(container.querySelector('[aria-label="Recent sales"]')).not.toBeNull()
    expect(receiptSelect.value).toBe("REC-SH001-202606-0001")
    expect(amountInput.value).toBe("50.00")
    expect(reasonSelect.value).toBe("KEY_BLANK_MISTAKE")
    expect(container.textContent).toContain("Refund amount exceeds remaining refundable balance")

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

  it("bank transfer capture failure allows checkout, print, and pending slip warning", async () => {
    const openSpy = jest.spyOn(window, "open").mockImplementation(() => null)
    const fetchMock = global.fetch as jest.Mock
    let pendingCount = 0

    mockedPendingEvidence.mockImplementation(async () => ({
      ok: true,
      result: {
        count: pendingCount,
        receipts:
          pendingCount > 0
            ? [
                {
                  evidenceId: "ev-1",
                  receiptNo: "R-test-bank-0001",
                  issuedAt: "2026-06-06T14:32:00.000Z",
                  total: "25.00",
                  staff: "103-Somsak Kamnuch",
                },
              ]
            : [],
      },
    }))

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

    const checkoutBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "CHECKOUT"
    )
    act(() => {
      checkoutBtn!.click()
    })
    await flushPromises()

    const bankTransferBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Bank Transfer")
    )
    act(() => {
      bankTransferBtn!.click()
    })
    await flushPromises()

    const captureBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Capture & Print")
    )
    await act(async () => {
      captureBtn!.click()
      await Promise.resolve()
    })
    await flushPromises()

    expect(container.textContent).toContain(POS_BANK_TRANSFER_UPLOAD_LATER_LABEL)

    pendingCount = 1

    const uploadLaterBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes(POS_BANK_TRANSFER_UPLOAD_LATER_LABEL)
    )
    await act(async () => {
      uploadLaterBtn!.click()
      await Promise.resolve()
      await Promise.resolve()
    })
    await flushPromises()

    const checkoutCalls = fetchMock.mock.calls.filter(
      ([url, init]) =>
        String(url) === "/api/pos/checkout" && (init as RequestInit | undefined)?.method === "POST"
    )
    expect(checkoutCalls.length).toBeGreaterThan(0)
    const lastCheckoutBody = JSON.parse(String(checkoutCalls.at(-1)?.[1]?.body))
    expect(lastCheckoutBody.paymentMethod).toBe("BANK_TRANSFER")

    expect(openSpy).toHaveBeenCalledWith("/shop/receipt/sale-bank-1?autoprint=1", "_blank")
    expect(mockedBackgroundUpload).not.toHaveBeenCalled()
    expect(container.textContent).toContain("Scan a product to add to cart")
    expect(container.querySelector('[data-testid="pos-evidence-pending-banner"]')).toBeTruthy()
    expect(container.textContent).toContain("SLIP PENDING")

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
