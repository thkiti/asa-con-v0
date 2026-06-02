import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentHeaderForm } from "@/components/stock/StockDocumentHeaderForm"
import type { StockDocumentEditorStateVM } from "@/lib/stock-ui/editor-types"

const state: StockDocumentEditorStateVM = {
  documentId: "doc-1",
  refNo: "TRO-1",
  docType: "TRANSFER_OUT",
  status: "DRAFT",
  date: "2026-06-02",
  branchId: "b1",
  fromLocId: "b1",
  toLocId: "b-ho",
  readOnly: false,
  lines: [],
}

describe("StockDocumentHeaderForm", () => {
  it("renders editable header fields", () => {
    const html = renderToStaticMarkup(
      <StockDocumentHeaderForm state={state} onChange={() => {}} />
    )

    expect(html).toContain("Transfer out")
    expect(html).toContain("TRO-1")
    expect(html).toContain('type="date"')
    expect(html).toContain("From location")
  })

  it("disables inputs when read-only", () => {
    const html = renderToStaticMarkup(
      <StockDocumentHeaderForm
        state={{ ...state, readOnly: true }}
        onChange={() => {}}
      />
    )

    expect(html).toContain("disabled")
  })
})
