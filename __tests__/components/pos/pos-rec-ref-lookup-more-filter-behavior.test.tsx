/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ReceiptLookupPage } from "@/components/pos/ReceiptLookupPage"
import { voucherInquiryMoreFilterButtonActive } from "@/lib/finance-ui/finance-visual-classes"
import type { SessionUserApi } from "@/lib/auth/session-user-api"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

jest.mock("@/lib/shop-ui/sales-targets-client", () => ({
  fetchSalesTargetBranches: jest.fn().mockResolvedValue({
    ok: true,
    branches: [{ id: "branch-1", code: "SH001", name: "Shop 1" }],
  }),
}))

jest.mock("@/lib/pos-ui/pos-rec-ref-lookup", () => ({
  searchPosRecRefLookup: jest.fn().mockResolvedValue({ ok: true, rows: [] }),
}))

import { searchPosRecRefLookup } from "@/lib/pos-ui/pos-rec-ref-lookup"

const mockSearch = searchPosRecRefLookup as jest.MockedFunction<typeof searchPosRecRefLookup>

const shopUser: SessionUserApi = {
  userId: "u1",
  staffId: "103",
  name: "Staff",
  role: "SH_STAFF",
  branchId: "branch-1",
  branchCode: "SH001",
  branchName: "Shop 1",
  documentEntityCode: "ASAS",
}

describe("ReceiptLookupPage More filter behavior", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    mockSearch.mockClear()
    mockSearch.mockResolvedValue({ ok: true, rows: [] })
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  function panel(): HTMLElement | null {
    return container.querySelector('[data-testid="receipt-lookup-more-filter-panel"]')
  }

  function moreButton(): HTMLButtonElement {
    return container.querySelector(
      '[data-testid="receipt-lookup-more-filter"]'
    ) as HTMLButtonElement
  }

  async function renderPage() {
    await act(async () => {
      root.render(<ReceiptLookupPage user={shopUser} />)
      await Promise.resolve()
    })
  }

  it("keeps the date box hidden on initial render", async () => {
    await renderPage()
    expect(panel()).toBeNull()
    expect(moreButton().getAttribute("aria-expanded")).toBe("false")
  })

  it("opens the date box when the dot is clicked", async () => {
    await renderPage()
    act(() => {
      moreButton().click()
    })
    expect(panel()).not.toBeNull()
  })

  it("closes the date box when the dot is clicked again", async () => {
    await renderPage()
    act(() => {
      moreButton().click()
    })
    act(() => {
      moreButton().click()
    })
    expect(panel()).toBeNull()
  })

  it("closes the date box when Search is clicked", async () => {
    await renderPage()
    act(() => {
      moreButton().click()
    })
    await act(async () => {
      ;(
        container.querySelector('[data-testid="receipt-lookup-search"]') as HTMLButtonElement
      ).click()
      await Promise.resolve()
    })
    expect(panel()).toBeNull()
    expect(mockSearch).toHaveBeenCalled()
  })

  it("closes the date box and clears From/To when Clear is clicked", async () => {
    await renderPage()

    act(() => {
      moreButton().click()
    })
    expect(panel()).not.toBeNull()

    await act(async () => {
      ;(
        container.querySelector('[data-testid="receipt-lookup-clear"]') as HTMLButtonElement
      ).click()
      await Promise.resolve()
    })

    expect(panel()).toBeNull()
    expect(moreButton().getAttribute("data-active")).toBe("false")
    expect(moreButton().className).not.toContain(voucherInquiryMoreFilterButtonActive)
  })

  it("does not auto-open the date box from default period alone", async () => {
    await renderPage()
    expect(panel()).toBeNull()
    expect(container.querySelector('[data-testid="receipt-lookup-filter-from"]')).toBeNull()
  })

  function setDateInputValue(element: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    setter?.call(element, value)
    element.dispatchEvent(new Event("input", { bubbles: true }))
    element.dispatchEvent(new Event("change", { bubbles: true }))
  }

  it("keeps the dot active when From or To has a value but the date box is closed", async () => {
    await renderPage()

    act(() => {
      moreButton().click()
    })

    const fromInput = container.querySelector(
      '[data-testid="receipt-lookup-filter-from"]'
    ) as HTMLInputElement

    await act(async () => {
      setDateInputValue(fromInput, "2026-06-01")
      await Promise.resolve()
    })

    act(() => {
      moreButton().click()
    })

    expect(panel()).toBeNull()
    expect(moreButton().getAttribute("data-active")).toBe("true")
    expect(moreButton().className).toContain(voucherInquiryMoreFilterButtonActive)
  })

  it("closes the date box when Search is clicked but keeps the dot active", async () => {
    await renderPage()

    act(() => {
      moreButton().click()
    })

    const fromInput = container.querySelector(
      '[data-testid="receipt-lookup-filter-from"]'
    ) as HTMLInputElement

    await act(async () => {
      setDateInputValue(fromInput, "2026-06-01")
      await Promise.resolve()
    })

    await act(async () => {
      ;(
        container.querySelector('[data-testid="receipt-lookup-search"]') as HTMLButtonElement
      ).click()
      await Promise.resolve()
    })

    expect(panel()).toBeNull()
    expect(moreButton().getAttribute("data-active")).toBe("true")
    expect(moreButton().className).toContain(voucherInquiryMoreFilterButtonActive)
  })
})
