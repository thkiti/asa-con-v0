import { renderToStaticMarkup } from "react-dom/server"
import { FinanceDocumentPageShell } from "@/components/finance/FinanceDocumentPageShell"
import { FINANCE_DOCUMENT_MAX_WIDTH_PX } from "@/components/finance/FinanceDocumentContainer"

describe("FinanceDocumentPageShell", () => {
  it("renders back link inside centered document container", () => {
    const html = renderToStaticMarkup(
      <FinanceDocumentPageShell backHref="/finance/opening-balance" backLabel="← Opening balance">
        <p>Document body</p>
      </FinanceDocumentPageShell>
    )
    expect(html).toContain('data-testid="finance-document-container"')
    expect(html).toContain(`data-finance-document-max-width="${FINANCE_DOCUMENT_MAX_WIDTH_PX}"`)
    expect(html).toContain("← Opening balance")
    expect(html).toContain("Document body")
  })
})
