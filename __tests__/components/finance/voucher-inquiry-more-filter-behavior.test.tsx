/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { VoucherInquiryListPage } from "@/components/finance/VoucherInquiryListPage"
import { voucherInquiryMoreFilterButtonActive } from "@/lib/finance-ui/finance-visual-classes"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let searchParams = new URLSearchParams(
  "periodKey=2026-06&from=2026-06-01&to=2026-06-30&postingState=all"
)
const replaceMock = jest.fn((url: string) => {
  const query = url.includes("?") ? url.split("?")[1] : ""
  searchParams = new URLSearchParams(query)
})

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/finance/vouchers",
  useSearchParams: () => searchParams,
}))

jest.mock("@/lib/finance-ui/voucher-inquiry", () => {
  const actual = jest.requireActual("@/lib/finance-ui/voucher-inquiry")
  return {
    ...actual,
    fetchFinanceDocuments: jest.fn().mockResolvedValue({ documents: [], total: 0 }),
  }
})

jest.mock("@/lib/finance-ui/pos-settlement-branches", () => ({
  fetchPosSettlementBranches: jest.fn().mockResolvedValue({ items: [] }),
  formatPosSettlementBranchLabel: (branch: { code: string; name: string }) =>
    `${branch.code} • ${branch.name}`,
}))

describe("VoucherInquiryListPage More filter behavior", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    searchParams = new URLSearchParams(
      "periodKey=2026-06&from=2026-06-01&to=2026-06-30&postingState=all"
    )
    replaceMock.mockClear()
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  function panel(): HTMLElement | null {
    return container.querySelector('[data-testid="voucher-inquiry-more-filter-panel"]')
  }

  function moreButton(): HTMLButtonElement {
    return container.querySelector(
      '[data-testid="voucher-inquiry-more-filter"]'
    ) as HTMLButtonElement
  }

  async function renderPage() {
    await act(async () => {
      root.render(<VoucherInquiryListPage />)
      await Promise.resolve()
    })
  }

  it("keeps the date box hidden on initial render when from/to query values exist", async () => {
    await renderPage()

    expect(panel()).toBeNull()
    expect(moreButton().getAttribute("data-active")).toBe("true")
    expect(moreButton().className).toContain(voucherInquiryMoreFilterButtonActive)
  })

  it("closes the date box when Search is clicked but keeps the dot active", async () => {
    await renderPage()

    act(() => {
      moreButton().click()
    })
    expect(panel()).not.toBeNull()

    await act(async () => {
      ;(
        container.querySelector('[data-testid="voucher-inquiry-search"]') as HTMLButtonElement
      ).click()
      await Promise.resolve()
    })

    expect(panel()).toBeNull()
    expect(replaceMock).toHaveBeenCalled()
    expect(moreButton().getAttribute("data-active")).toBe("true")
    expect(moreButton().className).toContain(voucherInquiryMoreFilterButtonActive)
  })

  it("reopens the date box with existing dates after Search", async () => {
    await renderPage()

    await act(async () => {
      ;(
        container.querySelector('[data-testid="voucher-inquiry-search"]') as HTMLButtonElement
      ).click()
      await Promise.resolve()
    })
    expect(panel()).toBeNull()

    act(() => {
      moreButton().click()
    })

    const fromInput = container.querySelector(
      '[data-testid="voucher-inquiry-filter-from"]'
    ) as HTMLInputElement
    expect(fromInput.value).toBe("2026-06-01")
  })

  it("closes the date box, clears From/To, and deactivates the dot when Clear is clicked", async () => {
    await renderPage()

    act(() => {
      moreButton().click()
    })

    await act(async () => {
      ;(
        container.querySelector('[data-testid="voucher-inquiry-clear"]') as HTMLButtonElement
      ).click()
      await Promise.resolve()
    })

    expect(replaceMock).toHaveBeenCalledWith("/finance/vouchers")
    expect(panel()).toBeNull()
    expect(moreButton().getAttribute("data-active")).toBe("false")
    expect(moreButton().className).not.toContain(voucherInquiryMoreFilterButtonActive)

    act(() => {
      moreButton().click()
    })

    const fromInput = container.querySelector(
      '[data-testid="voucher-inquiry-filter-from"]'
    ) as HTMLInputElement
    expect(fromInput.value).toBe("")
  })
})
