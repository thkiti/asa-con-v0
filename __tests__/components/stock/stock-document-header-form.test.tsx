import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentHeaderForm } from "@/components/stock/StockDocumentHeaderForm"
import type { StockDocumentEditorStateVM } from "@/lib/stock-ui/editor-types"

const state: StockDocumentEditorStateVM = {
  documentId: "doc-1",
  refNo: "TRO-SH001-202606-0001",
  docType: "TRANSFER_OUT",
  status: "DRAFT",
  date: "2026-06-02",
  branchId: "b1",
  legalEntityCode: "AS",
  fromLocId: "b1",
  toLocId: "b-ho",
  readOnly: false,
  lines: [],
}

const shops = [
  { id: "b1", code: "SH001", name: "Chidlom" },
  { id: "b2", code: "SH002", name: "Siam" },
]
const ho = { id: "b-ho", code: "HO999", name: "Head Office" }

describe("StockDocumentHeaderForm", () => {
  it("renders Shop dropdown instead of From/To location fields", () => {
    const html = renderToStaticMarkup(
      <StockDocumentHeaderForm
        state={state}
        onChange={() => {}}
        shopOptions={shops}
        hoBranch={ho}
      />
    )

    expect(html).toContain("ASAS • ORD")
    expect(html).toContain("ORD-SH001-202606-0001")
    expect(html).not.toContain("TRO-SH001-202606-0001")
    expect(html).toContain('type="date"')
    expect(html).toContain("Shop")
    expect(html).toContain('data-testid="stock-document-shop"')
    expect(html).toContain("SH001 • Chidlom")
    expect(html).not.toContain("From location")
    expect(html).not.toContain("To location")
  })

  it("ASAD DEY Shop lists SH destinations only", () => {
    const deyState: StockDocumentEditorStateVM = {
      ...state,
      legalEntityCode: "AD",
      branchId: "b-ho",
      fromLocId: "b-ho",
      toLocId: "b1",
      refNo: "TRO-HO999-202606-0001",
    }
    const html = renderToStaticMarkup(
      <StockDocumentHeaderForm
        state={deyState}
        onChange={() => {}}
        viewerEntityCode="AD"
        shopOptions={shops}
        hoBranch={ho}
      />
    )
    expect(html).toContain("ASAD • ORD")
    expect(html).toContain("SH001 • Chidlom")
    expect(html).toContain("SH002 • Siam")
    expect(html).not.toContain("HO999 • Head Office")
  })

  it("disables inputs when read-only", () => {
    const html = renderToStaticMarkup(
      <StockDocumentHeaderForm
        state={{ ...state, readOnly: true }}
        onChange={() => {}}
        shopOptions={shops}
        hoBranch={ho}
      />
    )

    expect(html).toContain("disabled")
  })
})
