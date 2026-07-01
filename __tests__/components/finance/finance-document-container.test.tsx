import { renderToStaticMarkup } from "react-dom/server"
import {
  FINANCE_DOCUMENT_MAX_WIDTH_PX,
  FinanceDocumentContainer,
} from "@/components/finance/FinanceDocumentContainer"

describe("FinanceDocumentContainer", () => {
  it("centers content with full width up to the finance document max and shared padding", () => {
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

  it("defines shared padding and max width in globals.css", () => {
    const fs = require("fs") as typeof import("fs")
    const path = require("path") as typeof import("path")
    const source = fs.readFileSync(
      path.join(process.cwd(), "app", "globals.css"),
      "utf8"
    )
    expect(source).toMatch(
      /\.finance-document-container\s*\{[\s\S]*max-width:\s*var\(--finance-document-max-width\)[\s\S]*padding:\s*1\.5rem/
    )
  })
})
