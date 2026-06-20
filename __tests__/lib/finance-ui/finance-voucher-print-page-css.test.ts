import { buildFinanceVoucherPrintPageCss } from "@/lib/finance-ui/finance-voucher-print-page-css"

describe("finance-voucher-print-page-css", () => {
  it("builds A4 @page rules with native @bottom-center Page X of Y counters", () => {
    const css = buildFinanceVoucherPrintPageCss()

    expect(css).toContain("size: A4 portrait")
    expect(css).toContain("margin: 12mm")
    expect(css).toContain("@bottom-center")
    expect(css).toContain('content: "Page " counter(page) " of " counter(pages)')
  })
})
