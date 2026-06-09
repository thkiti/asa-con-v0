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

  it("updates confirm label when BANK TRANSFER is selected", () => {
    const onConfirm = jest.fn()
    const { container, unmount } = renderOverlay({ onConfirm })

    const bankTransferButton = [...container.querySelectorAll("button")].find((btn) =>
      btn.textContent?.includes("Bank Transfer")
    )

    act(() => {
      bankTransferButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(container.textContent).toContain("Pay BANK TRANSFER")

    const confirmButton = [...container.querySelectorAll("button")].find((btn) =>
      btn.textContent?.includes("Pay BANK TRANSFER")
    )

    act(() => {
      confirmButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(onConfirm).toHaveBeenCalledWith(
      "BANK_TRANSFER" satisfies PosCheckoutPaymentMethod
    )
    unmount()
  })

  it("defaults payment method constant is CASH", () => {
    expect(POS_CHECKOUT_PAYMENT_DEFAULT).toBe("CASH")
  })
})
