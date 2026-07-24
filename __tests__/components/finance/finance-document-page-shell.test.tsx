/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { FinanceDocumentPageShell } from "@/components/finance/FinanceDocumentPageShell"
import { FINANCE_DOCUMENT_MAX_WIDTH_PX } from "@/components/finance/FinanceDocumentContainer"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}))

describe("FinanceDocumentPageShell", () => {
  it("renders back control inside centered document container", () => {
    const html = renderToStaticMarkup(
      <FinanceDocumentPageShell
        backHref="/finance/opening-balance"
        backLabel="← Opening balance"
      >
        <p>Document body</p>
      </FinanceDocumentPageShell>
    )
    expect(html).toContain('data-testid="finance-document-container"')
    expect(html).toContain(
      `data-finance-document-max-width="${FINANCE_DOCUMENT_MAX_WIDTH_PX}"`
    )
    expect(html).toContain('data-testid="finance-document-back-link"')
    expect(html).toContain('aria-label="Back to Opening balance"')
    expect(html).toContain("Document body")
  })
})
