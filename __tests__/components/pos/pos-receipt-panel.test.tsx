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

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query === "(pointer: coarse)" ? matches : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
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

describe("PosReceiptPanel product detail popup", () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    })
  })

  it("desktop: shows popup on row hover with image, name, and code", () => {
    mockMatchMedia(false)
    const { container } = renderPanel([cartLineWithImage])
    const row = container.querySelector('[data-testid="pos-cart-row"]')
    expect(row).not.toBeNull()

    act(() => {
      row!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))
    })

    const popup = container.querySelector('[data-testid="pos-cart-product-detail-popup"]')
    expect(popup).not.toBeNull()
    expect(popup?.textContent).toContain("Widget A")
    expect(popup?.textContent).toContain("0101001")
    expect(popup?.querySelector("img")?.getAttribute("src")).toBe(
      "https://blob.example/products/0101001.png"
    )
    expect(
      container.querySelector('[data-testid="pos-cart-detail-backdrop"]')
    ).toBeNull()
  })

  it("desktop: hides popup on row mouse leave", () => {
    mockMatchMedia(false)
    const { container } = renderPanel([cartLineWithImage])
    const row = container.querySelector('[data-testid="pos-cart-row"]')

    act(() => {
      row!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))
    })
    expect(
      container.querySelector('[data-testid="pos-cart-product-detail-popup"]')
    ).not.toBeNull()

    act(() => {
      row!.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }))
    })
    expect(
      container.querySelector('[data-testid="pos-cart-product-detail-popup"]')
    ).toBeNull()
  })

  it("desktop: shows name and code without image when catalogImageUrl is null", () => {
    mockMatchMedia(false)
    const { container } = renderPanel([cartLineWithoutImage])
    const row = container.querySelector('[data-testid="pos-cart-row"]')

    act(() => {
      row!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))
    })

    const popup = container.querySelector('[data-testid="pos-cart-product-detail-popup"]')
    expect(popup).not.toBeNull()
    expect(popup?.textContent).toContain("Widget B")
    expect(popup?.textContent).toContain("0101002")
    expect(popup?.textContent).toContain("No image")
    expect(popup?.querySelector("img")).toBeNull()
  })

  it("tablet: opens modal popup on row tap and closes on backdrop tap", () => {
    mockMatchMedia(true)
    const { container } = renderPanel([cartLineWithImage])
    const row = container.querySelector('[data-testid="pos-cart-row"]')

    act(() => {
      row!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(
      container.querySelector('[data-testid="pos-cart-detail-backdrop"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="pos-cart-product-detail-popup"]')
    ).not.toBeNull()

    const backdrop = container.querySelector('[data-testid="pos-cart-detail-backdrop"]')
    act(() => {
      backdrop!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(
      container.querySelector('[data-testid="pos-cart-product-detail-popup"]')
    ).toBeNull()
  })

  it("tablet: qty button clicks do not open popup", () => {
    mockMatchMedia(true)
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
    expect(
      container.querySelector('[data-testid="pos-cart-product-detail-popup"]')
    ).toBeNull()
  })

  it("desktop: qty buttons still call handlers", () => {
    mockMatchMedia(false)
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
