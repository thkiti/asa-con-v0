/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PettyCashVoucherListPage } from "@/components/finance/PettyCashVoucherListPage"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/finance/vouchers",
  useSearchParams: () => new URLSearchParams("legalEntityCode=AS"),
}))

jest.mock("@/lib/finance-ui/use-finance-legal-entity-scope", () => ({
  useFinanceLegalEntityScope: () => "AS",
}))

const mockFetchPettyCashVouchers = jest.fn().mockResolvedValue({
  entries: [
    {
      id: "pcv-1",
      entryNo: "PCV-260001",
      status: "POSTED",
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate: "2026-06-21T12:00:00.000Z",
      payeeName: "Office supplies",
      totalAmount: "500.00",
      lineCount: 2,
      createdByStaffId: "staff-1",
      postedAt: "2026-06-21T15:00:00.000Z",
      createdAt: "2026-06-21T11:00:00.000Z",
    },
  ],
  total: 1,
})

jest.mock("@/lib/finance-ui/petty-cash-vouchers", () => ({
  fetchPettyCashVouchers: (...args: unknown[]) => mockFetchPettyCashVouchers(...args),
  deleteDraftPettyCashVoucher: jest.fn(),
}))

describe("PettyCashVoucherListPage inquiry filters", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    mockFetchPettyCashVouchers.mockClear()
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  function moreButton(): HTMLButtonElement {
    const button = container.querySelector('[data-testid="petty-cash-voucher-more-filter"]')
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("More filter button not found")
    }
    return button
  }

  function periodInput(): HTMLInputElement {
    const input = container.querySelector('[data-testid="petty-cash-voucher-filter-period"]')
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Period input not found")
    }
    return input
  }

  it("renders actions above filters without legal entity dropdown", async () => {
    await act(async () => {
      root.render(<PettyCashVoucherListPage />)
    })

    const html = container.innerHTML
    expect(html).toContain('data-testid="petty-cash-voucher-actions"')
    expect(html).toContain('data-testid="petty-cash-voucher-filters"')
    expect(html).toContain('data-testid="new-petty-cash-voucher"')
    expect(html).toContain('data-testid="petty-cash-voucher-refresh"')
    expect(html).not.toContain('data-testid="filter-legal-entity"')
    expect(html).not.toContain("Legal entity")
    expect(html.indexOf('data-testid="petty-cash-voucher-actions"')).toBeLessThan(
      html.indexOf('data-testid="petty-cash-voucher-filters"')
    )
  })

  it("orders filters as Period, dot, No., Status, Post, Search, Clear", async () => {
    await act(async () => {
      root.render(<PettyCashVoucherListPage />)
    })

    const html = container.innerHTML
    const periodIndex = html.indexOf('data-testid="petty-cash-voucher-filter-period"')
    const moreIndex = html.indexOf('data-testid="petty-cash-voucher-more-filter"')
    const noIndex = html.indexOf('data-testid="petty-cash-voucher-filter-no"')
    const statusIndex = html.indexOf('data-testid="filter-status"')
    const postIndex = html.indexOf('data-testid="petty-cash-voucher-filter-post"')
    const searchIndex = html.indexOf('data-testid="petty-cash-voucher-search"')
    const clearIndex = html.indexOf('data-testid="petty-cash-voucher-clear"')

    expect(periodIndex).toBeGreaterThan(-1)
    expect(moreIndex).toBeGreaterThan(periodIndex)
    expect(noIndex).toBeGreaterThan(moreIndex)
    expect(statusIndex).toBeGreaterThan(noIndex)
    expect(postIndex).toBeGreaterThan(statusIndex)
    expect(searchIndex).toBeGreaterThan(postIndex)
    expect(clearIndex).toBeGreaterThan(searchIndex)
    expect(html).toContain('placeholder="PCV-…"')
    expect(html).not.toContain('data-testid="filter-entry-type"')
  })

  it("hides date from/to until more filter is opened", async () => {
    await act(async () => {
      root.render(<PettyCashVoucherListPage />)
    })

    expect(
      container.querySelector('[data-testid="petty-cash-voucher-more-filter-panel"]')
    ).toBeNull()

    await act(async () => {
      moreButton().click()
    })

    expect(
      container.querySelector('[data-testid="petty-cash-voucher-more-filter-panel"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="petty-cash-voucher-filter-from"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="petty-cash-voucher-filter-to"]')
    ).not.toBeNull()
  })

  it("shows active dot when hidden date filters have values", async () => {
    await act(async () => {
      root.render(<PettyCashVoucherListPage />)
    })

    await act(async () => {
      moreButton().click()
    })

    const fromInput = container.querySelector(
      '[data-testid="petty-cash-voucher-filter-from"]'
    )
    if (!(fromInput instanceof HTMLInputElement)) {
      throw new Error("Date from input not found")
    }

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      nativeInputValueSetter?.call(fromInput, "2026-06-01")
      fromInput.dispatchEvent(new Event("input", { bubbles: true }))
      fromInput.dispatchEvent(new Event("change", { bubbles: true }))
    })

    expect(moreButton().dataset.active).toBe("true")
  })

  it("closes hidden date box on Search and Clear", async () => {
    await act(async () => {
      root.render(<PettyCashVoucherListPage />)
    })

    await act(async () => {
      moreButton().click()
    })

    const searchButton = container.querySelector('[data-testid="petty-cash-voucher-search"]')
    if (!(searchButton instanceof HTMLButtonElement)) {
      throw new Error("Search button not found")
    }

    await act(async () => {
      searchButton.click()
    })

    expect(
      container.querySelector('[data-testid="petty-cash-voucher-more-filter-panel"]')
    ).toBeNull()

    await act(async () => {
      moreButton().click()
    })

    const fromInput = container.querySelector(
      '[data-testid="petty-cash-voucher-filter-from"]'
    )
    if (!(fromInput instanceof HTMLInputElement)) {
      throw new Error("Date from input not found")
    }

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      nativeInputValueSetter?.call(fromInput, "2026-06-10")
      fromInput.dispatchEvent(new Event("input", { bubbles: true }))
      fromInput.dispatchEvent(new Event("change", { bubbles: true }))
    })

    const clearButton = container.querySelector('[data-testid="petty-cash-voucher-clear"]')
    if (!(clearButton instanceof HTMLButtonElement)) {
      throw new Error("Clear button not found")
    }

    await act(async () => {
      clearButton.click()
    })

    expect(
      container.querySelector('[data-testid="petty-cash-voucher-more-filter-panel"]')
    ).toBeNull()
    expect(moreButton().dataset.active).toBe("false")
  })

  it("triggers Search when Enter is pressed in Period", async () => {
    await act(async () => {
      root.render(<PettyCashVoucherListPage />)
    })

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      nativeInputValueSetter?.call(periodInput(), "2026-06")
      periodInput().dispatchEvent(new Event("input", { bubbles: true }))
      periodInput().dispatchEvent(new Event("change", { bubbles: true }))
    })

    const callsBefore = mockFetchPettyCashVouchers.mock.calls.length

    await act(async () => {
      periodInput().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      )
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFetchPettyCashVouchers.mock.calls.length).toBeGreaterThan(callsBefore)
    expect(mockFetchPettyCashVouchers).toHaveBeenLastCalledWith(
      "AS",
      expect.objectContaining({
        dateFrom: "2026-06-01",
        dateTo: "2026-06-30",
      })
    )
  })

  it("triggers Search when Enter is pressed in No.", async () => {
    await act(async () => {
      root.render(<PettyCashVoucherListPage />)
    })

    const noInput = container.querySelector('[data-testid="petty-cash-voucher-filter-no"]')
    if (!(noInput instanceof HTMLInputElement)) {
      throw new Error("No. input not found")
    }

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      nativeInputValueSetter?.call(noInput, "PCV-260001")
      noInput.dispatchEvent(new Event("input", { bubbles: true }))
      noInput.dispatchEvent(new Event("change", { bubbles: true }))
    })

    const callsBefore = mockFetchPettyCashVouchers.mock.calls.length

    await act(async () => {
      noInput.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      )
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFetchPettyCashVouchers.mock.calls.length).toBeGreaterThan(callsBefore)
    expect(mockFetchPettyCashVouchers).toHaveBeenLastCalledWith(
      "AS",
      expect.objectContaining({ search: "PCV-260001" })
    )
  })

  it("does not send legal entity in list API filter payload", async () => {
    await act(async () => {
      root.render(<PettyCashVoucherListPage />)
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFetchPettyCashVouchers).toHaveBeenCalled()
    for (const call of mockFetchPettyCashVouchers.mock.calls) {
      expect(call[0]).not.toHaveProperty("legalEntityCode")
    }
  })
})
