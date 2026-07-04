/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { InvoiceVoucherListPage } from "@/components/finance/InvoiceVoucherListPage"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/finance/vouchers",
  useSearchParams: () => new URLSearchParams("legalEntityCode=AS"),
}))

jest.mock("@/lib/finance-ui/use-finance-legal-entity-scope", () => ({
  useFinanceLegalEntityScope: () => "AS",
}))

const mockFetchInvoiceVouchers = jest.fn().mockResolvedValue({
  entries: [
    {
      id: "inv-1",
      entryNo: "INV-260001",
      status: "POSTED",
      branchId: "branch-1",
      legalEntityCode: "AS",
      invoiceDate: "2026-06-21T12:00:00.000Z",
      dueDate: "2026-07-21T12:00:00.000Z",
      customerName: "ABC Co.",
      totalAmount: "2500.00",
      lineCount: 2,
      createdByStaffId: "staff-1",
      postedAt: "2026-06-21T15:00:00.000Z",
      createdAt: "2026-06-21T11:00:00.000Z",
    },
  ],
  total: 1,
})

jest.mock("@/lib/finance-ui/invoice-vouchers", () => ({
  fetchInvoiceVouchers: (...args: unknown[]) => mockFetchInvoiceVouchers(...args),
  deleteDraftInvoiceVoucher: jest.fn(),
}))

describe("InvoiceVoucherListPage inquiry filters", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    mockFetchInvoiceVouchers.mockClear()
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  function moreButton(): HTMLButtonElement {
    const button = container.querySelector('[data-testid="invoice-voucher-more-filter"]')
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("More filter button not found")
    }
    return button
  }

  function periodInput(): HTMLInputElement {
    const input = container.querySelector('[data-testid="invoice-voucher-filter-period"]')
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Period input not found")
    }
    return input
  }

  it("renders actions above filters without legal entity dropdown", async () => {
    await act(async () => {
      root.render(<InvoiceVoucherListPage />)
    })

    const html = container.innerHTML
    expect(html).toContain('data-testid="invoice-voucher-actions"')
    expect(html).toContain('data-testid="invoice-voucher-filters"')
    expect(html).toContain('data-testid="new-invoice-voucher"')
    expect(html).toContain('data-testid="invoice-voucher-refresh"')
    expect(html).not.toContain('data-testid="filter-legal-entity"')
    expect(html).not.toContain("Legal entity")
    expect(html.indexOf('data-testid="invoice-voucher-actions"')).toBeLessThan(
      html.indexOf('data-testid="invoice-voucher-filters"')
    )
  })

  it("orders filters as Period, dot, No., Status, Post, Search, Clear", async () => {
    await act(async () => {
      root.render(<InvoiceVoucherListPage />)
    })

    const html = container.innerHTML
    const periodIndex = html.indexOf('data-testid="invoice-voucher-filter-period"')
    const moreIndex = html.indexOf('data-testid="invoice-voucher-more-filter"')
    const noIndex = html.indexOf('data-testid="invoice-voucher-filter-no"')
    const statusIndex = html.indexOf('data-testid="filter-status"')
    const postIndex = html.indexOf('data-testid="invoice-voucher-filter-post"')
    const searchIndex = html.indexOf('data-testid="invoice-voucher-search"')
    const clearIndex = html.indexOf('data-testid="invoice-voucher-clear"')

    expect(periodIndex).toBeGreaterThan(-1)
    expect(moreIndex).toBeGreaterThan(periodIndex)
    expect(noIndex).toBeGreaterThan(moreIndex)
    expect(statusIndex).toBeGreaterThan(noIndex)
    expect(postIndex).toBeGreaterThan(statusIndex)
    expect(searchIndex).toBeGreaterThan(postIndex)
    expect(clearIndex).toBeGreaterThan(searchIndex)
    expect(html).toContain('placeholder="INV-…"')
    expect(html).not.toContain('data-testid="filter-entry-type"')
  })

  it("hides date from/to until more filter is opened", async () => {
    await act(async () => {
      root.render(<InvoiceVoucherListPage />)
    })

    expect(
      container.querySelector('[data-testid="invoice-voucher-more-filter-panel"]')
    ).toBeNull()

    await act(async () => {
      moreButton().click()
    })

    expect(
      container.querySelector('[data-testid="invoice-voucher-more-filter-panel"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="invoice-voucher-filter-from"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="invoice-voucher-filter-to"]')
    ).not.toBeNull()
  })

  it("shows active dot when hidden date filters have values", async () => {
    await act(async () => {
      root.render(<InvoiceVoucherListPage />)
    })

    await act(async () => {
      moreButton().click()
    })

    const fromInput = container.querySelector(
      '[data-testid="invoice-voucher-filter-from"]'
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
      root.render(<InvoiceVoucherListPage />)
    })

    await act(async () => {
      moreButton().click()
    })

    const searchButton = container.querySelector('[data-testid="invoice-voucher-search"]')
    if (!(searchButton instanceof HTMLButtonElement)) {
      throw new Error("Search button not found")
    }

    await act(async () => {
      searchButton.click()
    })

    expect(
      container.querySelector('[data-testid="invoice-voucher-more-filter-panel"]')
    ).toBeNull()

    await act(async () => {
      moreButton().click()
    })

    const fromInput = container.querySelector(
      '[data-testid="invoice-voucher-filter-from"]'
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

    const clearButton = container.querySelector('[data-testid="invoice-voucher-clear"]')
    if (!(clearButton instanceof HTMLButtonElement)) {
      throw new Error("Clear button not found")
    }

    await act(async () => {
      clearButton.click()
    })

    expect(
      container.querySelector('[data-testid="invoice-voucher-more-filter-panel"]')
    ).toBeNull()
    expect(moreButton().dataset.active).toBe("false")
  })

  it("triggers Search when Enter is pressed in Period", async () => {
    await act(async () => {
      root.render(<InvoiceVoucherListPage />)
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

    const callsBefore = mockFetchInvoiceVouchers.mock.calls.length

    await act(async () => {
      periodInput().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      )
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFetchInvoiceVouchers.mock.calls.length).toBeGreaterThan(callsBefore)
    expect(mockFetchInvoiceVouchers).toHaveBeenLastCalledWith(
      "AS",
      expect.objectContaining({
        dateFrom: "2026-06-01",
        dateTo: "2026-06-30",
      })
    )
  })

  it("triggers Search when Enter is pressed in No.", async () => {
    await act(async () => {
      root.render(<InvoiceVoucherListPage />)
    })

    const noInput = container.querySelector('[data-testid="invoice-voucher-filter-no"]')
    if (!(noInput instanceof HTMLInputElement)) {
      throw new Error("No. input not found")
    }

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      nativeInputValueSetter?.call(noInput, "INV-260001")
      noInput.dispatchEvent(new Event("input", { bubbles: true }))
      noInput.dispatchEvent(new Event("change", { bubbles: true }))
    })

    const callsBefore = mockFetchInvoiceVouchers.mock.calls.length

    await act(async () => {
      noInput.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      )
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFetchInvoiceVouchers.mock.calls.length).toBeGreaterThan(callsBefore)
    expect(mockFetchInvoiceVouchers).toHaveBeenLastCalledWith(
      "AS",
      expect.objectContaining({ search: "INV-260001" })
    )
  })

  it("does not send legal entity in list API filter payload", async () => {
    await act(async () => {
      root.render(<InvoiceVoucherListPage />)
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFetchInvoiceVouchers).toHaveBeenCalled()
    for (const call of mockFetchInvoiceVouchers.mock.calls) {
      expect(call[0]).not.toHaveProperty("legalEntityCode")
    }
  })
})
