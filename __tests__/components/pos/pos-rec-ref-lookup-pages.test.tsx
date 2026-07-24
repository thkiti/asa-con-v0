import { renderToStaticMarkup } from "react-dom/server"
import { PosRecRefLookupFilterBar } from "@/components/pos/PosRecRefLookupFilterBar"
import { PosRecRefLookupResultsTable } from "@/components/pos/PosRecRefLookupResultsTable"
import { PosRecRefLookupPdfIndicator } from "@/components/pos/PosRecRefLookupPdfIndicator"
import {
  financeFilterSelect,
  voucherInquiryFilterControl,
  voucherInquiryFilterFramed,
  voucherInquiryFilterSelect,
  voucherInquiryMoreFilterButtonActive,
} from "@/lib/finance-ui/finance-visual-classes"
import { POS_REC_REF_LOOKUP_DOC_TYPE_OPTIONS } from "@/lib/pos-ui/pos-rec-ref-lookup-filter"
import type { PosRecRefLookupRow } from "@/lib/pos-ui/pos-rec-ref-lookup"

const sampleRow: PosRecRefLookupRow = {
  id: "receipt-1",
  documentNo: "REC-SH001-202606-0113",
  issuedAt: "2026-06-06T10:00:00.000Z",
  branchCode: "SH001",
  branchName: "Chidlom",
  docType: "REC",
  statusLabel: "Ready",
  pdfAvailable: true,
}

describe("PosRecRefLookup UI", () => {
  it("exposes REC/REF doc type options", () => {
    expect(POS_REC_REF_LOOKUP_DOC_TYPE_OPTIONS.map((option) => option.label)).toEqual([
      "All",
      "REC",
      "REF",
    ])
  })

  it("renders compact filter row without open date box by default", () => {
    const html = renderToStaticMarkup(
      <PosRecRefLookupFilterBar
        filter={{ periodKey: "2026-06", from: "2026-06-01", to: "2026-06-30" }}
        onFilterChange={() => {}}
        documentNo=""
        onDocumentNoChange={() => {}}
        isMoreFilterOpen={false}
        setIsMoreFilterOpen={() => {}}
        onSearch={() => {}}
        onClear={() => {}}
        testIdPrefix="receipt-lookup"
      />
    )

    expect(html).toContain('data-testid="receipt-lookup-filter-period"')
    expect(html).toContain('data-testid="receipt-lookup-more-filter"')
    expect(html).toContain('data-testid="receipt-lookup-filter-doc-type"')
    expect(html).toContain('data-testid="receipt-lookup-filter-no"')
    expect(html).toContain('data-testid="receipt-lookup-search"')
    expect(html).toContain('data-testid="receipt-lookup-clear"')
    expect(html).not.toContain('data-testid="receipt-lookup-more-filter-panel"')
    expect(html).not.toContain('data-testid="receipt-lookup-filter-from"')
    expect(html).toContain('data-active="true"')
    expect(html).toContain(voucherInquiryMoreFilterButtonActive)
    expect(html).not.toMatch(/<span[^>]*>From<\/span>/)
    expect(html).not.toMatch(/<span[^>]*>To<\/span>/)
  })

  it("uses framed finance filter controls", () => {
    const html = renderToStaticMarkup(
      <PosRecRefLookupFilterBar
        filter={{ periodKey: "2026-06" }}
        onFilterChange={() => {}}
        documentNo=""
        onDocumentNoChange={() => {}}
        isMoreFilterOpen={false}
        setIsMoreFilterOpen={() => {}}
        onSearch={() => {}}
        onClear={() => {}}
        testIdPrefix="receipt-lookup"
      />
    )

    expect(html).toContain(voucherInquiryFilterSelect)
    expect(html).toContain(voucherInquiryFilterFramed)
    expect(html).toContain(financeFilterSelect)
    expect(html).toContain(voucherInquiryFilterControl)
  })

  it("renders compact table columns", () => {
    const html = renderToStaticMarkup(
      <PosRecRefLookupResultsTable rows={[sampleRow]} total={1} testIdPrefix="receipt-lookup" />
    )

    for (const column of ["Doc No.", "Date", "Branch", "Type", "Status", "PDF", "Actions"]) {
      expect(html).toContain(column)
    }
    expect(html).toContain("REC-SH001-202606-0113")
    expect(html).toContain("REC")
  })

  it("shows no PDF dot when archive is unsupported", () => {
    const html = renderToStaticMarkup(
      <PosRecRefLookupPdfIndicator row={{ ...sampleRow, pdfAvailable: null }} />
    )
    expect(html).toBe("")
  })

  it("shows missing PDF dot when archive is missing", () => {
    const html = renderToStaticMarkup(
      <PosRecRefLookupPdfIndicator row={{ ...sampleRow, pdfAvailable: false }} />
    )
    expect(html).toContain('data-testid="pos-rec-ref-lookup-pdf-receipt-1"')
    expect(html).toContain("bg-[var(--tone-error-fg)]")
  })
})
