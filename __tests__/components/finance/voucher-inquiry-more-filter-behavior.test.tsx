/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { VoucherInquiryListPage } from "@/components/finance/VoucherInquiryListPage"
import { voucherInquiryMoreFilterButtonActive } from "@/lib/finance-ui/finance-visual-classes"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let searchParams = new URLSearchParams(
  "periodKey=2026-06&from=2026-06-01&to=2026-06-30&refType=COL&postingState=all"
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

jest.mock("@/lib/finance-ui/use-finance-legal-entity-scope", () => ({
  useFinanceLegalEntityScope: () => "AS",
}))

jest.mock("@/lib/finance-ui/voucher-inquiry", () => {
  const actual = jest.requireActual("@/lib/finance-ui/voucher-inquiry")
  return {
    ...actual,
    fetchFinanceDocuments: jest.fn().mockResolvedValue({ documents: [], total: 0 }),
  }
})

jest.mock("@/lib/finance-ui/pos-settlement-branches", () => ({
  fetchPosSettlementBranches: jest.fn().mockResolvedValue({
    items: [{ id: "branch-1", code: "SH001", name: "Shop 1" }],
  }),
  formatPosSettlementBranchLabel: (branch: { code: string; name: string }) =>
    `${branch.code} • ${branch.name}`,
}))

import { fetchFinanceDocuments } from "@/lib/finance-ui/voucher-inquiry"

const mockFetchFinanceDocuments = fetchFinanceDocuments as jest.Mock

describe("VoucherInquiryListPage More filter behavior", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    searchParams = new URLSearchParams(
      "periodKey=2026-06&from=2026-06-01&to=2026-06-30&refType=COL&postingState=all"
    )
    replaceMock.mockClear()
    mockFetchFinanceDocuments.mockClear()
    mockFetchFinanceDocuments.mockResolvedValue({ documents: [], total: 0 })
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

  it("closes the date box, clears From/To, keeps required period, and deactivates the dot when Clear is clicked", async () => {
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

    expect(replaceMock).toHaveBeenCalled()
    const clearedUrl = String(replaceMock.mock.calls.at(-1)?.[0] ?? "")
    expect(clearedUrl).toMatch(/\/finance\/vouchers\?/)
    expect(clearedUrl).toMatch(/periodKey=\d{4}-\d{2}/)
    expect(clearedUrl).toContain("postingState=all")
    expect(clearedUrl).not.toContain("refType=")
    expect(clearedUrl).not.toContain("from=")
    expect(clearedUrl).not.toContain("to=")
    expect(panel()).toBeNull()
    expect(moreButton().getAttribute("data-active")).toBe("false")
    expect(moreButton().className).not.toContain(voucherInquiryMoreFilterButtonActive)
    expect(
      container.querySelector('[data-testid="voucher-inquiry-doc-type-required"]')?.textContent
    ).toBe("เลือก Doc Type เพื่อค้นหาเอกสาร")
    expect(container.querySelector('[data-testid="voucher-inquiry-table"]')).toBeNull()

    act(() => {
      moreButton().click()
    })

    const fromInput = container.querySelector(
      '[data-testid="voucher-inquiry-filter-from"]'
    ) as HTMLInputElement
    expect(fromInput.value).toBe("")
  })
})

describe("VoucherInquiryListPage REC shop scope", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    searchParams = new URLSearchParams(
      "periodKey=2026-06&refType=REC&postingState=posted"
    )
    replaceMock.mockClear()
    mockFetchFinanceDocuments.mockClear()
    mockFetchFinanceDocuments.mockResolvedValue({ documents: [], total: 0 })
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
      root.render(<VoucherInquiryListPage />)
      await Promise.resolve()
    })
  }

  it("shows REC shop instruction and does not call the listing API when Branch is All", async () => {
    await renderPage()

    expect(
      container.querySelector('[data-testid="voucher-inquiry-rec-shop-required"]')?.textContent
    ).toBe(
      "สำหรับ REC เนื่องจากมีเอกสารจำนวนมาก กรุณาเลือก Shop และค้นหาครั้งละหนึ่ง Period"
    )
    expect(container.querySelector('[data-testid="voucher-inquiry-table"]')).toBeNull()
    expect(mockFetchFinanceDocuments).not.toHaveBeenCalled()
  })

  it("searches REC immediately when a specific Shop is selected", async () => {
    await renderPage()

    const branchSelect = container.querySelector(
      '[data-testid="voucher-inquiry-filter-branch"]'
    ) as HTMLSelectElement

    await act(async () => {
      branchSelect.value = "branch-1"
      branchSelect.dispatchEvent(new Event("change", { bubbles: true }))
      await Promise.resolve()
    })

    expect(replaceMock).toHaveBeenCalled()
    const nextUrl = String(replaceMock.mock.calls.at(-1)?.[0] ?? "")
    expect(nextUrl).toContain("refType=REC")
    expect(nextUrl).toContain("branchId=branch-1")
    expect(nextUrl).toContain("limit=50")
    expect(nextUrl).toContain("offset=0")
  })

  it("clears REC results and shows instruction again when Branch returns to All", async () => {
    searchParams = new URLSearchParams(
      "periodKey=2026-06&refType=REC&branchId=branch-1&postingState=posted&limit=50&offset=0"
    )
    mockFetchFinanceDocuments.mockResolvedValue({
      documents: [
        {
          id: "voucher-rec-1",
          rowKind: "posted",
          legalEntityCode: "AS",
          documentTypeCode: "REC",
          documentNo: "REC-SH001-202606-0001",
          voucherNo: "V-2026-06-00010",
          date: "2026-06-15T00:00:00.000Z",
          periodKey: "2026-06",
          branchId: "branch-1",
          branchCode: "SH001",
          branchName: "Shop 1",
          status: "POSTED",
          amount: "1500",
          journalEntryId: "journal-rec-1",
          operationalDocumentId: "sale-1",
          pdfAvailable: true,
          inquiryPath: "/shop/receipt/sale-1?branchId=branch-1",
          printPath: "/shop/receipt/sale-1?branchId=branch-1&autoprint=1",
        },
      ],
      total: 1,
    })

    await renderPage()
    expect(container.querySelector('[data-testid="voucher-inquiry-table"]')).not.toBeNull()

    const branchSelect = container.querySelector(
      '[data-testid="voucher-inquiry-filter-branch"]'
    ) as HTMLSelectElement

    await act(async () => {
      branchSelect.value = ""
      branchSelect.dispatchEvent(new Event("change", { bubbles: true }))
      await Promise.resolve()
    })

    const nextUrl = String(replaceMock.mock.calls.at(-1)?.[0] ?? "")
    expect(nextUrl).toContain("refType=REC")
    expect(nextUrl).not.toContain("branchId=")
    expect(
      container.querySelector('[data-testid="voucher-inquiry-rec-shop-required"]')?.textContent
    ).toBe(
      "สำหรับ REC เนื่องจากมีเอกสารจำนวนมาก กรุณาเลือก Shop และค้นหาครั้งละหนึ่ง Period"
    )
    expect(container.querySelector('[data-testid="voucher-inquiry-table"]')).toBeNull()
  })
})
