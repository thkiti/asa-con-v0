import { renderToStaticMarkup } from "react-dom/server"
import FinanceStockDocumentInquiryPage from "@/app/(main)/finance/stock-documents/page"
import { StockDocumentInquiryDetailView } from "@/components/stock/StockDocumentInquiryDetailView"
import {
  StockDocumentInquiryListPage,
  StockDocumentInquiryResultsTable,
} from "@/components/stock/StockDocumentInquiryListPage"
import { StockDocumentInquiryPdfIndicator } from "@/components/stock/StockDocumentInquiryPdfIndicator"
import {
  financeFilterSelect,
  voucherInquiryFilterControl,
  voucherInquiryFilterFramed,
  voucherInquiryFilterSelect,
} from "@/lib/finance-ui/finance-visual-classes"
import { STOCK_DOCUMENT_INQUIRY_KIND_OPTIONS } from "@/lib/stock/inquiry/stock-document-inquiry-filter-options"

jest.mock("@/components/main/EntityContextPageHeading", () => ({
  EntityContextPageHeading: ({ title }: { title: string }) => (
    <h1 data-testid="entity-context-page-heading">{title}</h1>
  ),
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/finance/stock-documents",
  useSearchParams: () =>
    new URLSearchParams("periodKey=2026-06&kind=ORD&postingState=all"),
}))

jest.mock("@/lib/stock-ui/stock-document-inquiry", () => {
  const actual = jest.requireActual("@/lib/stock-ui/stock-document-inquiry")
  return {
    ...actual,
    fetchStockDocumentsForInquiry: jest.fn(),
    fetchStockDocumentInquiryDetail: jest.fn(),
  }
})

jest.mock("@/lib/finance-ui/pos-settlement-branches", () => ({
  fetchPosSettlementBranches: jest.fn().mockResolvedValue({
    items: [{ id: "branch-1", code: "SH001", name: "Shop 1" }],
  }),
  formatPosSettlementBranchLabel: (branch: { code: string; name: string }) =>
    `${branch.code} • ${branch.name}`,
}))

import { fetchStockDocumentsForInquiry } from "@/lib/stock-ui/stock-document-inquiry"

const mockFetchStockDocuments = fetchStockDocumentsForInquiry as jest.Mock

const sampleRow = {
  id: "doc-1",
  legalEntityCode: "AS",
  documentNo: "ORD-SH001-202606-0001",
  date: "2026-06-15T00:00:00.000Z",
  periodKey: "2026-06",
  branchId: "branch-1",
  branchCode: "SH001",
  branchName: "Shop 1",
  phaseCode: "ORD" as const,
  status: "DRAFT" as const,
  posted: false,
  pdfAvailable: null,
  inquiryPath: "/finance/stock-documents/doc-1",
  printPath: null,
  voucherId: null,
  journalEntryId: null,
}

describe("Stock Document Inquiry UI", () => {
  beforeEach(() => {
    mockFetchStockDocuments.mockResolvedValue({
      documents: [sampleRow],
      total: 1,
    })
  })

  it("renders list page filter headings", () => {
    const html = renderToStaticMarkup(<StockDocumentInquiryListPage />)
    for (const label of [
      "Branch",
      "Period",
      "From",
      "To",
      "Doc Type",
      "No",
      "Status",
      "Posted",
      "Search",
      "Clear",
    ]) {
      expect(html).toContain(label)
    }
  })

  it("exposes all stock doc type options", () => {
    expect(STOCK_DOCUMENT_INQUIRY_KIND_OPTIONS.map((option) => option.label)).toEqual([
      "All",
      "CNT",
      "ADJ",
      "ORD",
      "DEY",
      "ORS",
      "ORI",
    ])
  })

  it("renders compact table columns", () => {
    const html = renderToStaticMarkup(
      <StockDocumentInquiryResultsTable
        documents={[sampleRow]}
        total={1}
        listReturnPath="/finance/stock-documents"
      />
    )
    for (const column of [
      "Doc No.",
      "Date",
      "Branch",
      "Type",
      "Status",
      "Posted",
      "PDF",
    ]) {
      expect(html).toContain(column)
    }
    expect(html).toContain("ORD-SH001-202606-0001")
    expect(html).toContain("ORD")
  })

  it("uses framed finance filter controls", () => {
    const html = renderToStaticMarkup(<StockDocumentInquiryListPage />)
    expect(html).toContain(voucherInquiryFilterSelect)
    expect(html).toContain(voucherInquiryFilterFramed)
    expect(html).toContain(financeFilterSelect)
    expect(html).toContain(voucherInquiryFilterControl)
  })

  it("shows no PDF dot when archive is unsupported", () => {
    const html = renderToStaticMarkup(
      <StockDocumentInquiryPdfIndicator row={{ id: "doc-1", pdfAvailable: null }} />
    )
    expect(html).toBe("")
  })

  it("shows missing PDF dot when archive is missing", () => {
    const html = renderToStaticMarkup(
      <StockDocumentInquiryPdfIndicator row={{ id: "doc-1", pdfAvailable: false }} />
    )
    expect(html).toContain('data-testid="stock-document-inquiry-pdf-doc-1"')
    expect(html).toContain("finance-pdf-indicator--missing")
  })

  it("renders finance stock document inquiry page shell", () => {
    const html = renderToStaticMarkup(<FinanceStockDocumentInquiryPage />)
    expect(html).toContain("Stock Document Inquiry")
  })

  it("renders detail view loading shell", () => {
    const html = renderToStaticMarkup(
      <StockDocumentInquiryDetailView documentId="doc-1" returnTo="/finance/stock-documents" />
    )
    expect(html).toContain("Loading…")
    expect(html).toContain("stock-document-inquiry-detail-heading")
  })
})
