import { readFileSync } from "node:fs"
import { join } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { DocumentInquiryMoreFilter } from "@/components/finance/DocumentInquiryMoreFilter"
import {
  voucherInquiryFilterPeriodGroup,
  voucherInquiryMoreFilterButton,
  voucherInquiryMoreFilterButtonActive,
  voucherInquiryMoreFilterDateInput,
  voucherInquiryMoreFilterPopover,
} from "@/lib/finance-ui/finance-visual-classes"

const baseProps = {
  periodKey: "2026-06",
  onPeriodKeyChange: () => {},
  periodTestId: "voucher-inquiry-filter-period",
  onFromChange: () => {},
  onToChange: () => {},
  isMoreFilterOpen: false,
  setIsMoreFilterOpen: () => {},
  /** Injected so static markup tests skip Next.js searchParams / period fetch. */
  periods: [] as const,
}

describe("DocumentInquiryMoreFilter", () => {
  it("does not render the date box by default", () => {
    const html = renderToStaticMarkup(
      <DocumentInquiryMoreFilter
        {...baseProps}
        from=""
        to=""
        testIdPrefix="voucher-inquiry"
      />
    )

    expect(html).not.toContain('data-testid="voucher-inquiry-more-filter-panel"')
    expect(html).not.toContain('data-testid="voucher-inquiry-filter-from"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('data-active="false"')
  })

  it("does not render the date box when from/to exist but isMoreFilterOpen is false", () => {
    const html = renderToStaticMarkup(
      <DocumentInquiryMoreFilter
        {...baseProps}
        from="2026-06-01"
        to="2026-06-30"
        testIdPrefix="voucher-inquiry"
      />
    )

    expect(html).not.toContain('data-testid="voucher-inquiry-more-filter-panel"')
    expect(html).not.toContain('data-testid="voucher-inquiry-filter-from"')
    expect(html).toContain(voucherInquiryMoreFilterButtonActive)
    expect(html).toContain('data-active="true"')
    expect(html).toContain('aria-expanded="false"')
  })

  it("renders period field and circular more-filter button with tooltip title", () => {
    const html = renderToStaticMarkup(
      <DocumentInquiryMoreFilter
        {...baseProps}
        from=""
        to=""
        testIdPrefix="voucher-inquiry"
      />
    )

    expect(html).toContain(voucherInquiryFilterPeriodGroup)
    expect(html).toContain('data-testid="voucher-inquiry-filter-period"')
    expect(html).toContain('data-testid="voucher-inquiry-more-filter"')
    expect(html).toContain('title="More filter"')
    expect(html).toContain('aria-label="More filter"')
    expect(html).toContain(voucherInquiryMoreFilterButton)
    expect(html).not.toContain(voucherInquiryMoreFilterButtonActive)
  })

  it("renders year and month controls in year-month period mode", () => {
    const html = renderToStaticMarkup(
      <DocumentInquiryMoreFilter
        {...baseProps}
        periodMode="year-month"
        from=""
        to=""
        testIdPrefix="voucher-inquiry"
      />
    )

    expect(html).toContain(voucherInquiryFilterPeriodGroup)
    expect(html).toContain(">Year</span>")
    expect(html).toContain(">Month</span>")
    expect(html).toContain('data-testid="voucher-inquiry-filter-period-year"')
    expect(html).toContain('data-testid="voucher-inquiry-filter-period-month"')
    expect(html).toContain('value="2026"')
    expect(html).toContain(">01 • JAN</option>")
    expect(html).toContain(">12 • DEC</option>")
    expect(html).toContain('data-testid="voucher-inquiry-filter-period"')
    expect(html).toContain('data-testid="voucher-inquiry-more-filter"')
  })

  it("positions the date box below the period group in globals.css", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")
    const block =
      css.match(/\.voucher-inquiry-more-filter-popover\s*\{[^}]+\}/s)?.[0] ?? ""

    expect(block).toContain("top: calc(100% + 6px)")
    expect(block).not.toContain("bottom: calc(100%")
  })

  it("renders the date box only when isMoreFilterOpen is true", () => {
    const html = renderToStaticMarkup(
      <DocumentInquiryMoreFilter
        {...baseProps}
        from="2026-06-01"
        to="2026-06-30"
        testIdPrefix="stock-document-inquiry"
        periodTestId="stock-document-inquiry-filter-period"
        isMoreFilterOpen
      />
    )

    expect(html).toContain(voucherInquiryMoreFilterPopover)
    expect(html).toContain('data-testid="stock-document-inquiry-more-filter-panel"')
    expect(html).toContain('data-testid="stock-document-inquiry-filter-from"')
    expect(html).toContain('data-testid="stock-document-inquiry-filter-to"')
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('data-active="true"')
  })

  it("shows only two date inputs in the open date box without visible From/To labels", () => {
    const html = renderToStaticMarkup(
      <DocumentInquiryMoreFilter
        {...baseProps}
        from=""
        to=""
        testIdPrefix="voucher-inquiry"
        isMoreFilterOpen
      />
    )

    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('data-testid="voucher-inquiry-more-filter-panel"')
    expect(html).toContain(voucherInquiryMoreFilterDateInput)
    expect(html).toContain('type="date"')
    expect(html).toContain('aria-label="From date"')
    expect(html).toContain('aria-label="To date"')
    expect(html).not.toMatch(/<span[^>]*>From<\/span>/)
    expect(html).not.toMatch(/<span[^>]*>To<\/span>/)
  })
})
