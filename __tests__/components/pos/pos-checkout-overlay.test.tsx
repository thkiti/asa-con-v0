/**
 * @jest-environment jsdom
 */
import {
  POS_BANK_TRANSFER_UPLOAD_LATER_LABEL,
  POS_CHECKOUT_PAYMENT_OPTIONS,
  POS_PRINT_RECEIPT_LABEL,
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

import {
  captureVideoFrame,
  startCheckoutCameraStream,
} from "@/lib/pos-ui/capture-video-frame"

const mockedCapture = captureVideoFrame as jest.MockedFunction<typeof captureVideoFrame>
const mockedStartCamera = startCheckoutCameraStream as jest.MockedFunction<
  typeof startCheckoutCameraStream
>

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
    onPrintReceipt: () => {},
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

function clickButton(container: ParentNode, label: string | RegExp) {
  const button = [...container.querySelectorAll("button")].find((btn) =>
    typeof label === "string" ? btn.textContent?.includes(label) : label.test(btn.textContent ?? "")
  )
  act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
  return button
}

describe("PosCheckoutOverlay", () => {
  beforeEach(() => {
    mockedCapture.mockReset()
    mockedStartCamera.mockReset()
    mockedStartCamera.mockResolvedValue({} as MediaStream)
  })

  it("shows three payment method buttons without an immediate confirm button", () => {
    const { container, unmount } = renderOverlay()

    expect(POS_CHECKOUT_PAYMENT_OPTIONS).toHaveLength(3)
    expect(container.textContent).toContain("Cash")
    expect(container.textContent).toContain("Card")
    expect(container.textContent).toContain("Bank Transfer")
    expect(container.textContent).not.toContain("Pay CASH")
    expect(container.textContent).not.toContain("Sale complete")

    unmount()
  })

  it("cash: valid amount paid shows summary and Print Receipt calls checkout input", () => {
    const onPrintReceipt = jest.fn()
    const { container, unmount } = renderOverlay({ onPrintReceipt })

    clickButton(container, "Cash")

    const input = container.querySelector(
      '[data-testid="pos-checkout-amount-paid"]'
    ) as HTMLInputElement
    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      nativeSetter?.call(input, "150")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    clickButton(container, "Continue")

    expect(container.textContent).toContain("Total Amount")
    expect(container.textContent).toContain("Amount Received")
    expect(container.textContent).toContain("Change Money")
    expect(container.textContent).toContain("50.00")

    clickButton(container, POS_PRINT_RECEIPT_LABEL)

    expect(onPrintReceipt).toHaveBeenCalledWith({
      paymentMethod: "CASH",
      paidAmount: 150,
      bankTransferEvidence: undefined,
    })

    unmount()
  })

  it("cash: amount paid below total shows error and does not print", () => {
    const onPrintReceipt = jest.fn()
    const { container, unmount } = renderOverlay({ onPrintReceipt })

    clickButton(container, "Cash")

    const input = container.querySelector(
      '[data-testid="pos-checkout-amount-paid"]'
    ) as HTMLInputElement
    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      nativeSetter?.call(input, "50")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    })

    expect(container.querySelector('[data-testid="pos-checkout-amount-error"]')).toBeTruthy()
    expect(onPrintReceipt).not.toHaveBeenCalled()

    unmount()
  })

  it("card: shows zero change summary and Print Receipt calls checkout input", () => {
    const onPrintReceipt = jest.fn()
    const { container, unmount } = renderOverlay({ onPrintReceipt })

    clickButton(container, "Card")

    expect(container.textContent).toContain("Total Amount")
    expect(container.textContent).toContain("Amount Received")
    expect(container.textContent).toContain("100.00")
    expect(container.textContent).toContain("Change Money")
    expect(container.textContent).toContain("0.00")

    clickButton(container, POS_PRINT_RECEIPT_LABEL)

    expect(onPrintReceipt).toHaveBeenCalledWith({
      paymentMethod: "CARD",
      paidAmount: 100,
      bankTransferEvidence: undefined,
    })

    unmount()
  })

  it("opens bank capture view when BANK TRANSFER is selected", () => {
    const { container, unmount } = renderOverlay()

    clickButton(container, "Bank Transfer")

    expect(container.textContent).toContain("Capture Slip")
    expect(container.textContent).not.toContain(POS_PRINT_RECEIPT_LABEL)

    unmount()
  })

  it("bank transfer: capture success advances to Print Receipt confirm", async () => {
    const onPrintReceipt = jest.fn()
    const blob = new Blob(["jpeg"], { type: "image/jpeg" })
    mockedCapture.mockResolvedValue(blob)

    const { container, unmount } = renderOverlay({ onPrintReceipt })

    clickButton(container, "Bank Transfer")
    clickButton(container, "Capture Slip")
    await act(async () => {
      await Promise.resolve()
    })

    expect(container.textContent).toContain(POS_PRINT_RECEIPT_LABEL)
    clickButton(container, POS_PRINT_RECEIPT_LABEL)

    expect(onPrintReceipt).toHaveBeenCalledWith({
      paymentMethod: "BANK_TRANSFER",
      paidAmount: 100,
      bankTransferEvidence: blob,
    })

    unmount()
  })

  it("bank transfer: capture failure allows continue without slip then Print Receipt", async () => {
    const onPrintReceipt = jest.fn()
    mockedCapture.mockResolvedValue(null)

    const { container, unmount } = renderOverlay({ onPrintReceipt })

    clickButton(container, "Bank Transfer")
    clickButton(container, "Capture Slip")
    await act(async () => {
      await Promise.resolve()
    })

    expect(container.textContent).toContain(POS_BANK_TRANSFER_UPLOAD_LATER_LABEL)
    clickButton(container, POS_BANK_TRANSFER_UPLOAD_LATER_LABEL)

    expect(container.textContent).toContain(POS_PRINT_RECEIPT_LABEL)
    clickButton(container, POS_PRINT_RECEIPT_LABEL)

    expect(onPrintReceipt).toHaveBeenCalledWith({
      paymentMethod: "BANK_TRANSFER",
      paidAmount: 100,
      bankTransferEvidence: null,
    })

    unmount()
  })

  it("bank transfer: camera unavailable offers continue without slip", async () => {
    const onPrintReceipt = jest.fn()
    mockedStartCamera.mockResolvedValue(null)

    const { container, unmount } = renderOverlay({ onPrintReceipt })

    clickButton(container, "Bank Transfer")
    await act(async () => {
      await Promise.resolve()
    })

    expect(container.textContent).toContain("Could not open camera")
    expect(container.textContent).toContain(POS_BANK_TRANSFER_UPLOAD_LATER_LABEL)

    clickButton(container, POS_BANK_TRANSFER_UPLOAD_LATER_LABEL)
    clickButton(container, POS_PRINT_RECEIPT_LABEL)

    expect(onPrintReceipt).toHaveBeenCalledWith({
      paymentMethod: "BANK_TRANSFER",
      paidAmount: 100,
      bankTransferEvidence: null,
    })

    unmount()
  })

  it("shows server checkout error on confirm screen without resetting", () => {
    const { container, unmount } = renderOverlay({ error: "Checkout failed" })

    clickButton(container, "Card")

    expect(container.textContent).toContain("Checkout failed")
    expect(container.textContent).not.toContain("Sale complete")

    unmount()
  })
})
