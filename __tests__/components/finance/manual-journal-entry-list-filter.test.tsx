/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ManualJournalEntryListPage } from "@/components/finance/ManualJournalEntryListPage"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock("@/lib/finance-ui/manual-journal-entries", () => ({
  fetchManualJournalEntries: jest.fn().mockResolvedValue({
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
  }),
}))

describe("ManualJournalEntryListPage more filter", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
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
})
