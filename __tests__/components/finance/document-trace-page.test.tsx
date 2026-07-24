/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { DocumentTracePage } from "@/components/finance/DocumentTracePage"
import {
  fetchDocumentTrace,
  fetchDocumentTraceList,
} from "@/lib/finance-ui/document-trace"
import { fetchManualJournalSessionContext } from "@/lib/finance-ui/manual-journal-entry-session"
import type { DocumentTraceListRow } from "@/lib/finance/audit/document-trace-list"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function setInputValue(element: HTMLInputElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )
  descriptor?.set?.call(element, value)
  element.dispatchEvent(new Event("input", { bubbles: true }))
  element.dispatchEvent(new Event("change", { bubbles: true }))
}

function setSelectValue(element: HTMLSelectElement, value: string): void {
  element.value = value
  element.dispatchEvent(new Event("change", { bubbles: true }))
}

let searchParams = new URLSearchParams("")
const replaceMock = jest.fn((url: string) => {
  const query = url.includes("?") ? url.split("?")[1] : ""
  searchParams = new URLSearchParams(query ?? "")
})

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/finance/audit/document-trace",
  useSearchParams: () => searchParams,
}))

jest.mock("@/lib/finance-ui/manual-journal-entry-session", () => ({
  fetchManualJournalSessionContext: jest.fn().mockResolvedValue({
    documentEntityCode: "AS",
  }),
}))

jest.mock("@/lib/finance-ui/pos-settlement-branches", () => ({
  fetchPosSettlementBranches: jest.fn().mockResolvedValue({
    items: [{ id: "branch-1", code: "SH001", name: "Shop 1" }],
  }),
  formatPosSettlementBranchLabel: (branch: { code: string; name: string }) =>
    `${branch.code} • ${branch.name}`,
}))

jest.mock("@/lib/finance-ui/use-accounting-period-options", () => ({
  useAccountingPeriodOptions: () => ({
    periods: [
      {
        id: "p-2026-06",
        periodKey: "2026-06",
        legalEntityCode: "AS",
        branchId: "branch-1",
        branchName: "Shop 1",
        status: "OPEN",
        openedAt: "2026-06-01T00:00:00.000Z",
        closedAt: null,
      },
      {
        id: "p-2026-05",
        periodKey: "2026-05",
        legalEntityCode: "AS",
        branchId: "branch-1",
        branchName: "Shop 1",
        status: "OPEN",
        openedAt: "2026-05-01T00:00:00.000Z",
        closedAt: null,
      },
      {
        id: "p-2026-01",
        periodKey: "2026-01",
        legalEntityCode: "AS",
        branchId: "branch-1",
        branchName: "Shop 1",
        status: "OPEN",
        openedAt: "2026-01-01T00:00:00.000Z",
        closedAt: null,
      },
      {
        id: "p-2026-02",
        periodKey: "2026-02",
        legalEntityCode: "AS",
        branchId: "branch-1",
        branchName: "Shop 1",
        status: "OPEN",
        openedAt: "2026-02-01T00:00:00.000Z",
        closedAt: null,
      },
    ],
    loading: false,
    loadError: null,
    emptyMessage: null,
  }),
}))

jest.mock("@/lib/finance-ui/document-trace", () => ({
  fetchDocumentTrace: jest.fn().mockResolvedValue({ nodes: [], edges: [], warnings: [] }),
  fetchDocumentTraceList: jest.fn().mockResolvedValue({
    rows: [],
    warnings: [],
    totalCount: 0,
    hasMore: false,
    nextOffset: null,
  }),
}))

const fetchDocumentTraceMock = jest.mocked(fetchDocumentTrace)
const fetchDocumentTraceListMock = jest.mocked(fetchDocumentTraceList)
const fetchManualJournalSessionContextMock = jest.mocked(fetchManualJournalSessionContext)

describe("DocumentTracePage static render", () => {
  it("renders doc type and period filters with voucher search relabeled", () => {
    const html = renderToStaticMarkup(<DocumentTracePage />)

    expect(html).toContain("Doc Type")
    expect(html).toContain("Period")
    expect(html).toContain("REC • Receipt")
    expect(html).toContain("──────── FINANCE ────────")
    expect(html).toContain("Voucher No.")
    expect(html).not.toContain(">VOUCHER<")
    expect(html).toContain('data-testid="document-trace-more-filter"')
    expect(html).toContain('data-testid="document-trace-search-button"')
    expect(html).toContain('data-testid="document-trace-clear-button"')
  })
})

describe("DocumentTracePage fetch behavior", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    searchParams = new URLSearchParams("")
    replaceMock.mockClear()
    fetchDocumentTraceMock.mockClear()
    fetchDocumentTraceListMock.mockClear()
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  async function renderPage() {
    await act(async () => {
      root.render(<DocumentTracePage />)
      await Promise.resolve()
    })
    await act(async () => {
      await Promise.resolve()
    })
  }

  async function waitDebounce() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
  }

  function docTypeSelect(): HTMLSelectElement {
    return container.querySelector(
      '[data-testid="document-trace-doc-type-select"]'
    ) as HTMLSelectElement
  }

  function periodSelect(): HTMLSelectElement {
    return container.querySelector(
      '[data-testid="document-trace-period-input"]'
    ) as HTMLSelectElement
  }

  function searchButton(): HTMLButtonElement {
    return container.querySelector(
      '[data-testid="document-trace-search-button"]'
    ) as HTMLButtonElement
  }

  async function selectDocType(value: string) {
    await act(async () => {
      const select = docTypeSelect()
      select.value = value
      select.dispatchEvent(new Event("change", { bubbles: true }))
      await Promise.resolve()
    })
  }

  async function setPeriod(value: string) {
    await act(async () => {
      setSelectValue(periodSelect(), value)
      await Promise.resolve()
    })
  }

  async function clickSearch() {
    await act(async () => {
      searchButton().click()
      await Promise.resolve()
    })
    await act(async () => {
      await Promise.resolve()
    })
  }

  async function openMoreFilter() {
    await act(async () => {
      const button = container.querySelector(
        '[data-testid="document-trace-more-filter"]'
      ) as HTMLButtonElement
      button.click()
      await Promise.resolve()
    })
  }

  it("does not call list API when only doc type is selected", async () => {
    await renderPage()
    await selectDocType("MJV")
    await waitDebounce()

    expect(fetchDocumentTraceListMock).not.toHaveBeenCalled()
    expect(fetchDocumentTraceMock).not.toHaveBeenCalled()
  })

  it("does not call list API when only period is set", async () => {
    await renderPage()
    await setPeriod("2026-01")
    await waitDebounce()

    expect(fetchDocumentTraceListMock).not.toHaveBeenCalled()
    expect(fetchDocumentTraceMock).not.toHaveBeenCalled()
  })

  it("calls list API once when doc type and period are both set", async () => {
    await renderPage()
    await selectDocType("MJV")
    await setPeriod("2026-01")
    await waitDebounce()

    expect(fetchDocumentTraceListMock).toHaveBeenCalledTimes(1)
    expect(fetchDocumentTraceMock).not.toHaveBeenCalled()
  })

  it("does not refetch when filters are unchanged across re-render", async () => {
    await renderPage()
    await selectDocType("MJV")
    await setPeriod("2026-01")
    await waitDebounce()
    expect(fetchDocumentTraceListMock).toHaveBeenCalledTimes(1)

    fetchDocumentTraceListMock.mockClear()

    await act(async () => {
      root.render(<DocumentTracePage />)
      await Promise.resolve()
    })
    await waitDebounce()

    expect(fetchDocumentTraceListMock).not.toHaveBeenCalled()
  })

  it("calls list API once when period changes", async () => {
    await renderPage()
    await selectDocType("MJV")
    await setPeriod("2026-01")
    await waitDebounce()
    expect(fetchDocumentTraceListMock).toHaveBeenCalledTimes(1)

    fetchDocumentTraceListMock.mockClear()

    await setPeriod("2026-02")
    await waitDebounce()

    expect(fetchDocumentTraceListMock).toHaveBeenCalledTimes(1)
  })

  it("prefills period date drafts when the more filter opens", async () => {
    await renderPage()
    await selectDocType("MJV")
    await setPeriod("2026-01")
    await openMoreFilter()

    const fromInput = container.querySelector(
      '[data-testid="document-trace-more-date-from"]'
    ) as HTMLInputElement
    const toInput = container.querySelector(
      '[data-testid="document-trace-more-date-to"]'
    ) as HTMLInputElement

    expect(fromInput.value).toBe("01/01/2026")
    expect(toInput.value).toBe("31/01/2026")
  })

  it("does not refetch while typing a date until Search commits it", async () => {
    await renderPage()
    await selectDocType("MJV")
    await setPeriod("2026-01")
    await waitDebounce()
    fetchDocumentTraceListMock.mockClear()

    await openMoreFilter()
    await act(async () => {
      const input = container.querySelector(
        '[data-testid="document-trace-more-date-from"]'
      ) as HTMLInputElement
      setInputValue(input, "10/01/2026")
      await Promise.resolve()
    })
    await waitDebounce()

    expect(fetchDocumentTraceListMock).not.toHaveBeenCalled()

    await clickSearch()
    await waitDebounce()

    expect(fetchDocumentTraceListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        docType: "MJV",
        period: "2026-01",
        dateFrom: "2026-01-10",
      }),
      { offset: 0 }
    )
  })

  it("commits edited more-filter dates on Search", async () => {
    await renderPage()
    await selectDocType("MJV")
    await setPeriod("2026-01")
    await waitDebounce()
    expect(fetchDocumentTraceListMock).toHaveBeenCalledTimes(1)

    fetchDocumentTraceListMock.mockClear()
    await openMoreFilter()
    await act(async () => {
      const input = container.querySelector(
        '[data-testid="document-trace-more-date-from"]'
      ) as HTMLInputElement
      setInputValue(input, "10/01/2026")
      await Promise.resolve()
    })
    await clickSearch()
    await waitDebounce()

    expect(fetchDocumentTraceListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        docType: "MJV",
        period: "2026-01",
        dateFrom: "2026-01-10",
      }),
      { offset: 0 }
    )
  })

  it("closes the more filter panel after Search", async () => {
    await renderPage()
    await selectDocType("MJV")
    await setPeriod("2026-01")
    await openMoreFilter()

    expect(
      container.querySelector('[data-testid="document-trace-more-filter-panel"]')
    ).not.toBeNull()

    await clickSearch()

    expect(
      container.querySelector('[data-testid="document-trace-more-filter-panel"]')
    ).toBeNull()
  })
})

describe("DocumentTracePage shop filter visibility", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    searchParams = new URLSearchParams("")
    replaceMock.mockClear()
    fetchDocumentTraceListMock.mockClear()
    fetchManualJournalSessionContextMock.mockResolvedValue({
      documentEntityCode: "AS",
      staffId: "staff-1",
      branchId: "branch-1",
      branchCode: "SH001",
      branchName: "Shop 1",
      role: "FINANCE_STAFF",
    })
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  async function renderPage() {
    await act(async () => {
      root.render(<DocumentTracePage />)
      await Promise.resolve()
    })
    await act(async () => {
      await Promise.resolve()
    })
  }

  async function waitDebounce() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
  }

  function docTypeSelect(): HTMLSelectElement {
    return container.querySelector(
      '[data-testid="document-trace-doc-type-select"]'
    ) as HTMLSelectElement
  }

  function periodSelect(): HTMLSelectElement {
    return container.querySelector(
      '[data-testid="document-trace-period-input"]'
    ) as HTMLSelectElement
  }

  async function selectDocType(value: string) {
    await act(async () => {
      const select = docTypeSelect()
      select.value = value
      select.dispatchEvent(new Event("change", { bubbles: true }))
      await Promise.resolve()
    })
  }

  async function setPeriod(value: string) {
    await act(async () => {
      setSelectValue(periodSelect(), value)
      await Promise.resolve()
    })
  }

  async function selectMainShop(value: string) {
    await act(async () => {
      const select = container.querySelector(
        '[data-testid="document-trace-main-branch-select"]'
      ) as HTMLSelectElement
      select.value = value
      select.dispatchEvent(new Event("change", { bubbles: true }))
      await Promise.resolve()
    })
  }

  async function openMoreFilter() {
    await act(async () => {
      const button = container.querySelector(
        '[data-testid="document-trace-more-filter"]'
      ) as HTMLButtonElement
      button.click()
      await Promise.resolve()
    })
  }

  it("shows Shop on the main row for ASAS REC", async () => {
    await renderPage()

    expect(
      container.querySelector('[data-testid="document-trace-main-branch-select"]')
    ).not.toBeNull()
  })

  it("shows Shop on the main row before doc type is selected", async () => {
    await renderPage()

    expect(
      container.querySelector('[data-testid="document-trace-main-branch-select"]')
    ).not.toBeNull()
    expect(docTypeSelect().value).toBe("")
  })

  it("shows Shop on the main row for ASAS REF", async () => {
    await renderPage()
    await selectDocType("REF")

    expect(
      container.querySelector('[data-testid="document-trace-main-branch-select"]')
    ).not.toBeNull()
  })

  it("passes branchCode to the list API when a shop is selected for REC", async () => {
    await renderPage()
    await selectDocType("REC")
    await setPeriod("2026-01")
    await selectMainShop("SH001")
    await waitDebounce()

    expect(fetchDocumentTraceListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        docType: "REC",
        period: "2026-01",
        branchCode: "SH001",
      }),
      { offset: 0 }
    )
  })

  it("keeps Shop visible for finance doc types but omits branchCode from list API", async () => {
    fetchManualJournalSessionContextMock.mockResolvedValue({
      documentEntityCode: "AS",
      staffId: "staff-1",
      branchId: "branch-1",
      branchCode: "",
      branchName: "Shop 1",
      role: "FINANCE_STAFF",
    })

    await renderPage()
    await selectDocType("MJV")
    await setPeriod("2026-01")
    await selectMainShop("SH001")
    await waitDebounce()

    expect(
      container.querySelector('[data-testid="document-trace-main-branch-select"]')
    ).not.toBeNull()
    expect(fetchDocumentTraceListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        docType: "MJV",
        period: "2026-01",
      }),
      { offset: 0 }
    )
  })

  it("does not show an editable Shop field on the main row for ASAD on initial render", async () => {
    fetchManualJournalSessionContextMock.mockResolvedValue({
      documentEntityCode: "AD",
      staffId: "staff-1",
      branchId: "branch-1",
      branchCode: "ASAD",
      branchName: "ASAD",
      role: "FINANCE_STAFF",
    })

    await renderPage()

    expect(
      container.querySelector('[data-testid="document-trace-main-branch-select"]')
    ).toBeNull()
  })

  it("does not show an editable Shop field on the main row for ASAD", async () => {
    fetchManualJournalSessionContextMock.mockResolvedValue({
      documentEntityCode: "AD",
      staffId: "staff-1",
      branchId: "branch-1",
      branchCode: "ASAD",
      branchName: "ASAD",
      role: "FINANCE_STAFF",
    })

    await renderPage()
    await selectDocType("CNT")

    expect(
      container.querySelector('[data-testid="document-trace-main-branch-select"]')
    ).toBeNull()
  })

  it("does not duplicate Shop in More filter when it is on the main row", async () => {
    await renderPage()
    await selectDocType("REC")
    await openMoreFilter()

    expect(
      container.querySelector('[data-testid="document-trace-main-branch-select"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="document-trace-more-branch-select"]')
    ).toBeNull()
    expect(
      container.querySelector('[data-testid="document-trace-more-branch-locked"]')
    ).toBeNull()
  })

  it("appends rows when Load more is clicked", async () => {
    fetchDocumentTraceListMock
      .mockResolvedValueOnce({
        rows: [{ documentNo: "REC-1", date: "", branchCode: "", branchName: "", status: "", amount: null, voucherNo: null, traceQuery: "REC-1" }],
        warnings: [],
        totalCount: 2,
        hasMore: true,
        nextOffset: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ documentNo: "REC-2", date: "", branchCode: "", branchName: "", status: "", amount: null, voucherNo: null, traceQuery: "REC-2" }],
        warnings: [],
        totalCount: 2,
        hasMore: false,
        nextOffset: null,
      })

    await renderPage()
    await selectDocType("REC")
    await setPeriod("2026-01")
    await waitDebounce()

    expect(container.querySelectorAll('[data-testid^="document-trace-list-row-"]')).toHaveLength(1)

    await act(async () => {
      const button = container.querySelector(
        '[data-testid="document-trace-list-load-more"]'
      ) as HTMLButtonElement
      button.click()
      await Promise.resolve()
    })

    expect(fetchDocumentTraceListMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ docType: "REC", period: "2026-01" }),
      { offset: 1 }
    )
    expect(container.querySelectorAll('[data-testid^="document-trace-list-row-"]')).toHaveLength(2)
  })
})

describe("DocumentTracePage two-state view mode", () => {
  let container: HTMLDivElement
  let root: Root

  const listRow: DocumentTraceListRow = {
    documentNo: "REC-SH001-202601-001",
    date: "2026-01-15T10:00:00.000Z",
    branchCode: "SH001",
    branchName: "Shop 1",
    status: "COMPLETED",
    amount: "100.00",
    voucherNo: null,
    traceQuery: "REC-SH001-202601-001",
    documentHref: "/pos/shops/branch-1/sales/sale-1",
  }

  const traceResult = {
    nodes: [
      {
        id: "node-1",
        type: "RECEIPT",
        documentNo: "REC-SH001-202601-001",
        status: "COMPLETED",
        href: null,
      },
    ],
    edges: [],
    warnings: ["Trace warning"],
  }

  beforeEach(() => {
    searchParams = new URLSearchParams("")
    replaceMock.mockClear()
    fetchDocumentTraceMock.mockClear()
    fetchDocumentTraceListMock.mockClear()
    fetchDocumentTraceMock.mockResolvedValue(traceResult)
    fetchDocumentTraceListMock.mockResolvedValue({
      rows: [listRow],
      warnings: [],
      totalCount: 1,
      hasMore: false,
      nextOffset: null,
    })
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  async function renderPage() {
    await act(async () => {
      root.render(<DocumentTracePage />)
      await Promise.resolve()
    })
    await act(async () => {
      await Promise.resolve()
    })
  }

  async function waitDebounce() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
  }

  function viewMode(): string | null {
    return container.querySelector('[data-testid="document-trace-view-mode"]')?.textContent ?? null
  }

  async function selectDocType(value: string) {
    await act(async () => {
      const select = container.querySelector(
        '[data-testid="document-trace-doc-type-select"]'
      ) as HTMLSelectElement
      select.value = value
      select.dispatchEvent(new Event("change", { bubbles: true }))
      await Promise.resolve()
    })
  }

  async function setPeriod(value: string) {
    await act(async () => {
      const select = container.querySelector(
        '[data-testid="document-trace-period-input"]'
      ) as HTMLSelectElement
      setSelectValue(select, value)
      await Promise.resolve()
    })
  }

  async function clickSearch() {
    await act(async () => {
      const button = container.querySelector(
        '[data-testid="document-trace-search-button"]'
      ) as HTMLButtonElement
      button.click()
      await Promise.resolve()
    })
    await act(async () => {
      await Promise.resolve()
    })
  }

  async function clickTraceOnRow(traceQuery: string) {
    await act(async () => {
      const button = container.querySelector(
        `[data-testid="document-trace-trace-button-${traceQuery}"]`
      ) as HTMLButtonElement
      button.click()
      await Promise.resolve()
    })
    await act(async () => {
      await Promise.resolve()
    })
  }

  async function clickBackToList() {
    await act(async () => {
      const button = container.querySelector(
        '[data-testid="document-trace-back-to-list"]'
      ) as HTMLButtonElement
      button.click()
      await Promise.resolve()
    })
  }

  it("shows the list after search and keeps trace hidden", async () => {
    await renderPage()
    await selectDocType("REC")
    await setPeriod("2026-01")
    await clickSearch()

    expect(viewMode()).toBe("list")
    expect(container.querySelector('[data-testid="document-trace-view-list"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="document-trace-view-trace"]')).toBeNull()
    expect(container.querySelector('[data-testid="document-trace-list-table"]')).not.toBeNull()
  })

  it("hides the list when Trace is clicked", async () => {
    await renderPage()
    await selectDocType("REC")
    await setPeriod("2026-01")
    await clickSearch()
    await clickTraceOnRow(listRow.traceQuery)

    expect(viewMode()).toBe("trace")
    expect(container.querySelector('[data-testid="document-trace-view-list"]')).toBeNull()
    expect(container.querySelector('[data-testid="document-trace-view-trace"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="document-trace-result"]')).not.toBeNull()
  })

  it("restores the list when Back to Results is clicked without refetching", async () => {
    await renderPage()
    await selectDocType("REC")
    await setPeriod("2026-01")
    await clickSearch()
    const listCallsBeforeTrace = fetchDocumentTraceListMock.mock.calls.length
    await clickTraceOnRow(listRow.traceQuery)
    await clickBackToList()

    expect(viewMode()).toBe("list")
    expect(container.querySelector('[data-testid="document-trace-view-list"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="document-trace-view-trace"]')).toBeNull()
    expect(fetchDocumentTraceListMock.mock.calls.length).toBe(listCallsBeforeTrace)
    expect(container.querySelector('[data-testid="document-trace-list-table"]')).not.toBeNull()
  })

  it("renders document number as a link with href", async () => {
    await renderPage()
    await selectDocType("REC")
    await setPeriod("2026-01")
    await clickSearch()

    const link = container.querySelector(
      `[data-testid="document-trace-document-link-${listRow.traceQuery}"]`
    ) as HTMLAnchorElement

    expect(link).not.toBeNull()
    expect(link.getAttribute("href")).toBe(listRow.documentHref)
    expect(viewMode()).toBe("list")
  })

  it("returns to list mode when Search is run while viewing trace", async () => {
    await renderPage()
    await selectDocType("REC")
    await setPeriod("2026-01")
    await clickSearch()
    await clickTraceOnRow(listRow.traceQuery)
    expect(viewMode()).toBe("trace")

    fetchDocumentTraceListMock.mockClear()
    await clickSearch()

    expect(viewMode()).toBe("list")
    expect(container.querySelector('[data-testid="document-trace-view-list"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="document-trace-view-trace"]')).toBeNull()
    expect(fetchDocumentTraceListMock).toHaveBeenCalledTimes(1)
    expect(fetchDocumentTraceMock).toHaveBeenCalledTimes(1)
  })

  it("keeps filters unchanged after Back to Results", async () => {
    await renderPage()
    await selectDocType("REC")
    await setPeriod("2026-01")
    await clickSearch()
    await clickTraceOnRow(listRow.traceQuery)
    await clickBackToList()

    const docTypeSelect = container.querySelector(
      '[data-testid="document-trace-doc-type-select"]'
    ) as HTMLSelectElement
    const periodInput = container.querySelector(
      '[data-testid="document-trace-period-input"]'
    ) as HTMLInputElement

    expect(docTypeSelect.value).toBe("REC")
    expect(periodInput.value).toBe("2026-01")
  })
})
