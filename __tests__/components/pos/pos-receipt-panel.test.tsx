/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { PosReceiptPanel } from "@/components/pos/PosReceiptPanel"
import { POS_CART_PANEL_FRAME_CLASS } from "@/lib/pos-ui/pos-panel-frame"
import { decrementLineQty } from "@/lib/pos/cart"
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
    expect(html).toContain(POS_CART_PANEL_FRAME_CLASS)
    expect(html).toContain("overflow-hidden")
    expect(html).toContain("w-[380px]")
    expect(html).toContain("bg-orange-600")
    expect(html).not.toContain("border-orange-800")
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
  removeLine: jest.Mock
} {
  const incrementQty = jest.fn()
  const decrementQty = jest.fn()
  const removeLine = jest.fn()
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
        onRemoveLine={removeLine}
        onClearCart={noop}
      />
    )
  })
  return { container, root, incrementQty, decrementQty, removeLine }
}

function getCodeTrigger(container: ParentNode): HTMLButtonElement {
  const trigger = container.querySelector(
    '[data-testid="pos-cart-product-code-preview-trigger"]'
  )
  if (!trigger) throw new Error("product code preview trigger not found")
  return trigger as HTMLButtonElement
}

describe("PosReceiptPanel cart row display", () => {
  it("shows product code and QTYxPRICE on the second line", () => {
    const { container } = renderPanel([cartLineWithImage])

    expect(
      container.querySelector('[data-testid="pos-cart-row-qty-price"]')?.textContent
    ).toBe("2x50")
    expect(getCodeTrigger(container).textContent).toBe("0101001")
  })

  it("does not render a Remove button on cart rows", () => {
    const { container } = renderPanel([cartLineWithImage])

    const remove = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Remove"
    )
    expect(remove).toBeUndefined()
  })
})

describe("PosReceiptPanel product detail popup", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it("clicking product code opens image-fit modal preview", () => {
    const { container } = renderPanel([cartLineWithImage])

    act(() => {
      getCodeTrigger(container).click()
    })

    const popup = container.querySelector('[data-testid="pos-cart-product-detail-popup"]')
    expect(popup).not.toBeNull()
    expect(popup?.getAttribute("data-preview-size")).toBe("fit-content")
    expect(popup?.className).toContain("w-fit")
    expect(popup?.textContent).not.toContain("Widget A")
    expect(popup?.textContent).not.toContain("0101001")
    const img = container.querySelector(
      '[data-testid="pos-cart-product-detail-image-frame"]'
    ) as HTMLImageElement | null
    expect(img?.tagName).toBe("IMG")
    expect(img?.getAttribute("src")).toBe("https://blob.example/products/0101001.png")
    expect(img?.className).toContain("max-h-[80vh]")
    expect(img?.className).toContain("max-w-[60vw]")
    expect(img?.className).toContain("object-contain")
    expect(
      container.querySelector('[data-testid="pos-cart-detail-backdrop"]')
    ).not.toBeNull()
  })

  it("preview auto-closes after timer", () => {
    const { container } = renderPanel([cartLineWithImage])

    act(() => {
      getCodeTrigger(container).click()
    })
    expect(
      container.querySelector('[data-testid="pos-cart-product-detail-popup"]')
    ).not.toBeNull()

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(
      container.querySelector('[data-testid="pos-cart-product-detail-popup"]')
    ).toBeNull()
  })

  it("backdrop click closes modal preview immediately", () => {
    const { container } = renderPanel([cartLineWithImage])

    act(() => {
      getCodeTrigger(container).click()
    })
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

  it("row hover does not open preview", () => {
    const { container } = renderPanel([cartLineWithImage])
    const row = container.querySelector('[data-testid="pos-cart-row"]')

    act(() => {
      row!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))
    })

    expect(
      container.querySelector('[data-testid="pos-cart-product-detail-popup"]')
    ).toBeNull()
  })

  it("shows No image placeholder when catalogImageUrl is null", () => {
    const { container } = renderPanel([cartLineWithoutImage])

    act(() => {
      getCodeTrigger(container).click()
    })

    const popup = container.querySelector('[data-testid="pos-cart-product-detail-popup"]')
    expect(popup).not.toBeNull()
    expect(popup?.textContent).toBe("No image")
    expect(popup?.querySelector("img")).toBeNull()
    expect(
      popup?.querySelector('[data-testid="pos-cart-product-detail-no-image"]')
    ).not.toBeNull()
  })

  it("shows No image placeholder when catalog image fails to load", () => {
    const { container } = renderPanel([cartLineWithImage])

    act(() => {
      getCodeTrigger(container).click()
    })

    const img = container.querySelector(
      '[data-testid="pos-cart-product-detail-popup"] img'
    )
    expect(img).not.toBeNull()

    act(() => {
      img!.dispatchEvent(new Event("error", { bubbles: true }))
    })

    expect(
      container.querySelector('[data-testid="pos-cart-product-detail-no-image"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="pos-cart-product-detail-popup"] img')
    ).toBeNull()
  })

  it("qty button clicks do not open preview", () => {
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

  it("decrement qty to zero removes the line via cart logic", () => {
    const singleQtyLine: PosCartLine = { ...cartLineWithImage, qty: 1 }
    const lines = decrementLineQty([singleQtyLine], "p1")
    expect(lines).toHaveLength(0)
  })
})
