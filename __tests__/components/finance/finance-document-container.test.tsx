import { renderToStaticMarkup } from "react-dom/server"
import {
  FINANCE_DOCUMENT_MAX_WIDTH_PX,
  FinanceDocumentContainer,
} from "@/components/finance/FinanceDocumentContainer"

describe("FinanceDocumentContainer", () => {
  it("centers content with full width up to the finance document max", () => {
    const html = renderToStaticMarkup(
      <FinanceDocumentContainer>
        <p>Document body</p>
      </FinanceDocumentContainer>
    )

    expect(html).toContain('data-testid="finance-document-container"')
    expect(html).toContain(`data-finance-document-max-width="${FINANCE_DOCUMENT_MAX_WIDTH_PX}"`)
    expect(html).toContain("finance-document-container")
    expect(html).toContain("Document body")
  })
})
