import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentLinesTable } from "@/components/stock/StockDocumentLinesTable"

const lines = [
  {
    key: "line-1",
    productId: "p1",
    productCode: "C1",
    productName: "N1",
    qty: "1",
    endingQty: "10",
    reviewPostingDelta: "2",
  },
]

describe("StockDocumentLinesTable", () => {
  it("renders add line and remove for draft", () => {
    const html = renderToStaticMarkup(
      <StockDocumentLinesTable
        docType="PERFORMANCE"
        lines={lines}
        readOnly={false}
        onAddLine={() => {}}
        onRemoveLine={() => {}}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain("Add line")
    expect(html).toContain("Remove")
    expect(html).not.toContain("Ending qty")
  })

  it("shows ADJ columns for adjustment", () => {
    const html = renderToStaticMarkup(
      <StockDocumentLinesTable
        docType="ADJUSTMENT"
        lines={lines}
        readOnly={false}
        onAddLine={() => {}}
        onRemoveLine={() => {}}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain("Ending qty")
    expect(html).toContain("ADJ delta")
  })
})
