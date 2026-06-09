/**
 * @jest-environment jsdom
 */
import {
  POS_CHECKOUT_PAYMENT_DEFAULT,
  POS_CHECKOUT_PAYMENT_OPTIONS,
  type PosCheckoutPaymentMethod,
} from "@/lib/pos-ui/pos-payment-methods"
import { act, type ComponentProps } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosCheckoutOverlay } from "@/components/pos/PosCheckoutOverlay"
import type { PosCartLine } from "@/lib/pos/cart"

jest.mock("@/lib/pos-ui/capture-video-frame", () => ({
  captureVideoFrame: jest.fn(),
  startCheckoutCameraStream: jest.fn().mockResolvedValue({} as MediaStream),
  stopMediaStream: jest.fn(),
}))

import { captureVideoFrame } from "@/lib/pos-ui/capture-video-frame"

const mockedCapture = captureVideoFrame as jest.MockedFunction<typeof captureVideoFrame>

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const sampleLines: PosCartLine[] = [
  {
    productId: "p1",
    code: "0101001",
    name: "Widget",
    unitPrice: "100.00",
    qty: 1,
    priceSource: "SELLING_PRICE",
  },
]

function renderOverlay(props: Partial<ComponentProps<typeof PosCheckoutOverlay>> = {}) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root: Root = createRoot(container)

  const defaults: ComponentProps<typeof PosCheckoutOverlay> = {
    lines: sampleLines,
    pending: false,
    error: null,
    success: null,
    onConfirm: () => {},
    onBankTransferCapture: () => {},
    onPrintReceiptAndNewSale: () => {},
    onNewSaleWithoutPrint: () => {},
    onClose: () => {},
  }

  act(() => {
    root.render(<PosCheckoutOverlay {...defaults} {...props} />)
  })

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

describe("PosCheckoutOverlay", () => {
  beforeEach(() => {
    mockedCapture.mockReset()
  })

  it("shows three payment method buttons and defaults to CASH", () => {
    const { container, unmount } = renderOverlay()

    expect(POS_CHECKOUT_PAYMENT_OPTIONS).toHaveLength(3)
    expect(container.textContent).toContain("Cash")
    expect(container.textContent).toContain("Card")
    expect(container.textContent).toContain("Bank Transfer")

    const cashButton = [...container.querySelectorAll("button")].find((btn) =>
      btn.textContent?.includes("Cash")
    )
    expect(cashButton?.getAttribute("aria-pressed")).toBe("true")
    expect(container.textContent).toContain("Pay CASH")

    unmount()
  })

  it("opens bank capture view when BANK TRANSFER is selected", () => {
    const onBankTransferCapture = jest.fn()
    const { container, unmount } = renderOverlay({ onBankTransferCapture })

    const bankTransferButton = [...container.querySelectorAll("button")].find((btn) =>
      btn.textContent?.includes("Bank Transfer")
    )

    act(() => {
      bankTransferButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(container.textContent).toContain("Capture & Print")
    expect(container.textContent).not.toContain("Pay BANK TRANSFER")

    unmount()
  })

  it("calls onBankTransferCapture when capture succeeds", async () => {
    const onBankTransferCapture = jest.fn()
    const blob = new Blob(["jpeg"], { type: "image/jpeg" })
    mockedCapture.mockResolvedValue(blob)

    const { container, unmount } = renderOverlay({ onBankTransferCapture })

    const bankTransferButton = [...container.querySelectorAll("button")].find((btn) =>
      btn.textContent?.includes("Bank Transfer")
    )
    act(() => {
      bankTransferButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    const captureButton = [...container.querySelectorAll("button")].find((btn) =>
      btn.textContent?.includes("Capture & Print")
    )

    await act(async () => {
      captureButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
    })

    expect(onBankTransferCapture).toHaveBeenCalledWith(blob)
    unmount()
  })

  it("does not call onBankTransferCapture when capture fails", async () => {
    const onBankTransferCapture = jest.fn()
    mockedCapture.mockResolvedValue(null)

    const { container, unmount } = renderOverlay({ onBankTransferCapture })

    const bankTransferButton = [...container.querySelectorAll("button")].find((btn) =>
      btn.textContent?.includes("Bank Transfer")
    )
    act(() => {
      bankTransferButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    const captureButton = [...container.querySelectorAll("button")].find((btn) =>
      btn.textContent?.includes("Capture & Print")
    )

    await act(async () => {
      captureButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
    })

    expect(onBankTransferCapture).not.toHaveBeenCalled()
    expect(container.textContent).toContain("Capture failed")
    unmount()
  })

  it("confirms CASH checkout via onConfirm", () => {
    const onConfirm = jest.fn()
    const { container, unmount } = renderOverlay({ onConfirm })

    const confirmButton = [...container.querySelectorAll("button")].find((btn) =>
      btn.textContent?.includes("Pay CASH")
    )

    act(() => {
      confirmButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(onConfirm).toHaveBeenCalledWith(
      "CASH" satisfies PosCheckoutPaymentMethod
    )
    unmount()
  })

  it("defaults payment method constant is CASH", () => {
    expect(POS_CHECKOUT_PAYMENT_DEFAULT).toBe("CASH")
  })
})
