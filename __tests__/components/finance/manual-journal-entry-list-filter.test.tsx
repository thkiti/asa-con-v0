/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ManualJournalEntryListPage } from "@/components/finance/ManualJournalEntryListPage"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/finance/manual-journal-entries",
  useSearchParams: () => new URLSearchParams("legalEntityCode=AS"),
}))

jest.mock("@/lib/finance-ui/use-finance-legal-entity-scope", () => ({
  useFinanceLegalEntityScope: () => "AS",
}))

const mockFetchManualJournalEntries = jest.fn().mockResolvedValue({
  entries: [
    {
      id: "entry-1",
      entryNo: "MJV-260001",
      entryType: "MANUAL",
      status: "DRAFT",
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate: "2026-06-14T12:00:00.000Z",
      description: "Test",
      refNo: null,
      createdByStaffId: "staff-1",
      submittedAt: null,
      submittedByStaffId: null,
      confirmedAt: null,
      confirmedByStaffId: null,
      postedAt: null,
      postedByStaffId: null,
      cancelledAt: null,
      cancelledByStaffId: null,
      cancelReason: null,
      postedVoucherId: null,
      postedJournalEntryId: null,
      reversalJournalEntryId: null,
      createdAt: "2026-06-14T12:00:00.000Z",
      updatedAt: "2026-06-14T12:00:00.000Z",
      lineCount: 2,
    },
  ],
  total: 1,
})

jest.mock("@/lib/finance-ui/manual-journal-entries", () => ({
  fetchManualJournalEntries: (...args: unknown[]) => mockFetchManualJournalEntries(...args),
}))

describe("ManualJournalEntryListPage more filter", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    mockFetchManualJournalEntries.mockClear()
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  function moreButton(): HTMLButtonElement {
    const button = container.querySelector('[data-testid="manual-journal-entry-more-filter"]')
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("More filter button not found")
    }
    return button
  }

  function periodInput(): HTMLInputElement {
    const input = container.querySelector('[data-testid="manual-journal-entry-filter-period"]')
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Period input not found")
    }
    return input
  }

  it("orders filters as Period, dot, No., Status, Entry type, Post, Search, Clear", async () => {
    await act(async () => {
      root.render(<ManualJournalEntryListPage />)
    })

    const html = container.innerHTML
    const periodIndex = html.indexOf('data-testid="manual-journal-entry-filter-period"')
    const moreIndex = html.indexOf('data-testid="manual-journal-entry-more-filter"')
    const noIndex = html.indexOf('data-testid="manual-journal-entry-filter-no"')
    const statusIndex = html.indexOf('data-testid="filter-status"')
    const entryTypeIndex = html.indexOf('data-testid="filter-entry-type"')
    const postIndex = html.indexOf('data-testid="manual-journal-entry-filter-post"')
    const searchIndex = html.indexOf('data-testid="manual-journal-entry-search"')
    const clearIndex = html.indexOf('data-testid="manual-journal-entry-clear"')

    expect(moreIndex).toBeGreaterThan(periodIndex)
    expect(noIndex).toBeGreaterThan(moreIndex)
    expect(statusIndex).toBeGreaterThan(noIndex)
    expect(entryTypeIndex).toBeGreaterThan(statusIndex)
    expect(postIndex).toBeGreaterThan(entryTypeIndex)
    expect(searchIndex).toBeGreaterThan(postIndex)
    expect(clearIndex).toBeGreaterThan(searchIndex)
    expect(html).toContain('placeholder="MJV-…"')
    expect(html).not.toContain('data-testid="filter-legal-entity"')
  })

  it("closes hidden date box on Search and Clear", async () => {
    await act(async () => {
      root.render(<ManualJournalEntryListPage />)
    })

    await act(async () => {
      moreButton().click()
    })

    const searchButton = container.querySelector(
      '[data-testid="manual-journal-entry-search"]'
    )
    if (!(searchButton instanceof HTMLButtonElement)) {
      throw new Error("Search button not found")
    }

    await act(async () => {
      searchButton.click()
    })

    expect(
      container.querySelector('[data-testid="manual-journal-entry-more-filter-panel"]')
    ).toBeNull()

    await act(async () => {
      moreButton().click()
    })

    const clearButton = container.querySelector('[data-testid="manual-journal-entry-clear"]')
    if (!(clearButton instanceof HTMLButtonElement)) {
      throw new Error("Clear button not found")
    }

    await act(async () => {
      clearButton.click()
    })

    expect(
      container.querySelector('[data-testid="manual-journal-entry-more-filter-panel"]')
    ).toBeNull()
    expect(moreButton().dataset.active).toBe("false")
  })

  it("hides date from/to until more filter is opened", async () => {
    await act(async () => {
      root.render(<ManualJournalEntryListPage />)
    })

    expect(
      container.querySelector('[data-testid="manual-journal-entry-more-filter-panel"]')
    ).toBeNull()

    await act(async () => {
      moreButton().click()
    })

    expect(
      container.querySelector('[data-testid="manual-journal-entry-more-filter-panel"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="manual-journal-entry-filter-from"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="manual-journal-entry-filter-to"]')
    ).not.toBeNull()
  })

  it("renders loaded rows with dd/mm/yyyy dates only", async () => {
    await act(async () => {
      root.render(<ManualJournalEntryListPage />)
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(container.textContent).toContain("14/06/2026")
    expect(container.textContent).not.toContain("07:00 AM")
  })

  it("triggers Search when Enter is pressed in Period", async () => {
    await act(async () => {
      root.render(<ManualJournalEntryListPage />)
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

    const callsBefore = mockFetchManualJournalEntries.mock.calls.length

    await act(async () => {
      periodInput().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      )
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFetchManualJournalEntries.mock.calls.length).toBeGreaterThan(callsBefore)
    expect(mockFetchManualJournalEntries).toHaveBeenLastCalledWith(
      "AS",
      expect.objectContaining({
        dateFrom: "2026-06-01",
        dateTo: "2026-06-30",
      })
    )
  })

  it("triggers Search when Enter is pressed in No.", async () => {
    await act(async () => {
      root.render(<ManualJournalEntryListPage />)
    })

    const noInput = container.querySelector('[data-testid="manual-journal-entry-filter-no"]')
    if (!(noInput instanceof HTMLInputElement)) {
      throw new Error("No. input not found")
    }

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set
      nativeInputValueSetter?.call(noInput, "MJV-260001")
      noInput.dispatchEvent(new Event("input", { bubbles: true }))
      noInput.dispatchEvent(new Event("change", { bubbles: true }))
    })

    const callsBefore = mockFetchManualJournalEntries.mock.calls.length

    await act(async () => {
      noInput.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      )
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockFetchManualJournalEntries.mock.calls.length).toBeGreaterThan(callsBefore)
    expect(mockFetchManualJournalEntries).toHaveBeenLastCalledWith(
      "AS",
      expect.objectContaining({ entryNo: "MJV-260001" })
    )
  })
})
