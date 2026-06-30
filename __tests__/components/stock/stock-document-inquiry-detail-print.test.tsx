/**
 * @jest-environment jsdom
 */
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { StockDocumentInquiryDetailView } from "@/components/stock/StockDocumentInquiryDetailView"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

jest.mock("@/components/main/EntityContextPageHeading", () => ({
  EntityContextPageHeading: ({ title }: { title: string }) => (
    <h1 data-testid="entity-context-page-heading">{title}</h1>
  ),
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/finance/stock-documents/doc-1",
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock("@/lib/stock-ui/stock-document-inquiry", () => {
  const actual = jest.requireActual("@/lib/stock-ui/stock-document-inquiry")
  return {
    ...actual,
    fetchStockDocumentInquiryDetail: jest.fn(),
  }
})

import { fetchStockDocumentInquiryDetail } from "@/lib/stock-ui/stock-document-inquiry"

const mockFetchDetail = fetchStockDocumentInquiryDetail as jest.Mock

function mount(ui: ReactElement) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  act(() => {
    root.render(ui)
  })
  return { container, root }
}

describe("StockDocumentInquiryDetailView print readiness", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchDetail.mockResolvedValue({
      id: "doc-1",
      legalEntityCode: "AS",
      phaseCode: "ORD",
      phaseLabelTh: "ใบสั่งของ",
      documentNo: "ORD-SH001-202606-0001",
      date: "2026-06-15T00:00:00.000Z",
      branchId: "branch-1",
      branchCode: "SH001",
      branchName: "Shop 1",
      staffId: "ST001",
      staffName: "Staff One",
      status: "SUBMITTED",
      posted: false,
      pdfAvailable: null,
      printPath: "/finance/stock-documents/doc-1?autoprint=1",
      voucherId: null,
      journalEntryId: null,
      stockMovementPath: "/shop/stock-documents/doc-1",
      createdAt: "2026-06-14T10:00:00.000Z",
      submittedAt: "2026-06-14T11:00:00.000Z",
      confirmedAt: null,
      postedAt: null,
      totalQty: 0,
      totalAmount: null,
      lines: [],
    })
  })

  it("renders print actions, print link, and hidden print sheet when detail loads", async () => {
    const { container } = mount(
      <StockDocumentInquiryDetailView documentId="doc-1" returnTo="/finance/stock-documents" />
    )

    await act(async () => {
      await Promise.resolve()
    })

    const html = container.innerHTML
    expect(html).toContain('data-testid="stock-document-print-actions"')
    expect(html).toContain('data-testid="action-print-out"')
    expect(html).toContain('data-testid="stock-document-inquiry-print-link"')
    expect(html).toContain("/finance/stock-documents/doc-1?autoprint=1")
    expect(html).toContain('data-testid="stock-document-inquiry-print-sheet"')
    expect(html).not.toContain("finance-legacy-pdf-snapshot")
  })
})
