/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { PosReceiptPanel } from "@/components/pos/PosReceiptPanel"
import type { PosCartLine } from "@/lib/pos/cart"
import type { PosTerminalSession } from "@/lib/pos-ui/types"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const session: PosTerminalSession = {
  userId: "u1",
  staffId: "103",
  name: "Somsak Kamnuch",
  role: "SH_STAFF",
  branchId: "b1",
  branchCode: "SH001",
  branchName: "Chidlom",
}

const noop = () => {}

describe("PosReceiptPanel", () => {
  it("shows preview receipt number and combined Staff line", () => {
    const html = renderToStaticMarkup(
      <PosReceiptPanel
        session={session}
        receiptNo="REC-SH001-202606-0001"
        lines={[]}
        onIncrementQty={noop}
        onDecrementQty={noop}
        onRemoveLine={noop}
        onClearCart={noop}
      />
    )
    expect(html).toContain("Receipt:")
    expect(html).toContain("REC-SH001-202606-0001")
    expect(html).toContain("Staff:")
    expect(html).toContain("103 • Somsak Kamnuch")
    expect(html).not.toContain("Staff ID")
    expect(html).not.toContain("Staff name")
  })

  it("shows allocated receipt number when provided", () => {
    const html = renderToStaticMarkup(
      <PosReceiptPanel
        session={session}
        receiptNo="REC-SH001-202606-0002"
        lines={[]}
        onIncrementQty={noop}
        onDecrementQty={noop}
        onRemoveLine={noop}
        onClearCart={noop}
      />
    )
    expect(html).toContain("REC-SH001-202606-0002")
  })
})

const cartLineWithImage: PosCartLine = {
  productId: "p1",
  code: "0101001",
  name: "Widget A",
  qty: 2,
  unitPrice: "50.00",
  priceSource: "SELLING",
  catalogImageUrl: "https://blob.example/products/0101001.png",
}

const cartLineWithoutImage: PosCartLine = {
  productId: "p2",
  code: "0101002",
  name: "Widget B",
  qty: 1,
  unitPrice: "10.00",
  priceSource: "SELLING",
  catalogImageUrl: null,
}

function renderPanel(lines: PosCartLine[]): {
  container: HTMLDivElement
  root: Root
  incrementQty: jest.Mock
  decrementQty: jest.Mock
} {
  const incrementQty = jest.fn()
  const decrementQty = jest.fn()
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      <PosReceiptPanel
        session={session}
        receiptNo="REC-SH001-202606-0001"
        lines={lines}
        onIncrementQty={incrementQty}
        onDecrementQty={decrementQty}
        onRemoveLine={noop}
        onClearCart={noop}
      />
    )
  })
  return { container, root, incrementQty, decrementQty }
}

describe("PosReceiptPanel catalog hover preview", () => {
  it("shows preview when hovering product code with image URL", () => {
    const { container } = renderPanel([cartLineWithImage])
    const code = container.querySelector('[data-testid="pos-cart-product-code"]')
    expect(code).not.toBeNull()

    act(() => {
      code!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))
    })

    const preview = container.querySelector('[data-testid="pos-cart-catalog-preview"]')
    expect(preview).not.toBeNull()
    expect(preview?.querySelector("img")?.getAttribute("src")).toBe(
      "https://blob.example/products/0101001.png"
    )
  })

  it("does not show preview when cart line has no image URL", () => {
    const { container } = renderPanel([cartLineWithoutImage])
    const code = container.querySelector('[data-testid="pos-cart-product-code"]')

    act(() => {
      code!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))
    })

    expect(
      container.querySelector('[data-testid="pos-cart-catalog-preview"]')
    ).toBeNull()
  })

  it("still calls qty handlers when buttons are clicked", () => {
    const { container, incrementQty, decrementQty } = renderPanel([cartLineWithImage])

    const inc = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.getAttribute("aria-label")?.includes("Increase qty")
    )
    const dec = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.getAttribute("aria-label")?.includes("Decrease qty")
    )

    act(() => {
      inc!.click()
      dec!.click()
    })

    expect(incrementQty).toHaveBeenCalledWith("p1")
    expect(decrementQty).toHaveBeenCalledWith("p1")
  })
})
