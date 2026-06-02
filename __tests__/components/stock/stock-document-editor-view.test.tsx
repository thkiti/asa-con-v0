import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentEditorView } from "@/components/stock/StockDocumentEditorView"
import type { StockDocumentEditorStateVM } from "@/lib/stock-ui/editor-types"

const draftState: StockDocumentEditorStateVM = {
  documentId: null,
  refNo: null,
  docType: "PERFORMANCE",
  status: "DRAFT",
  date: "2026-06-02",
  branchId: "branch-shop",
  fromLocId: "branch-shop",
  toLocId: "",
  readOnly: false,
  lines: [
    {
      key: "line-1",
      productId: "prod-1",
      productCode: "C1",
      productName: "Item",
      qty: "2",
      endingQty: "",
      reviewPostingDelta: "",
    },
  ],
}

describe("StockDocumentEditorView", () => {
  it("renders header, lines, and save for draft", () => {
    const html = renderToStaticMarkup(
      <StockDocumentEditorView
        state={draftState}
        loading={false}
        saving={false}
        error={null}
        saveMessage={null}
        onHeaderChange={() => {}}
        onAddLine={() => {}}
        onRemoveLine={() => {}}
        onLineChange={() => {}}
        onSave={() => {}}
      />
    )

    expect(html).toContain("Document header")
    expect(html).toContain("Lines")
    expect(html).toContain("Save draft")
    expect(html).toContain("prod-1")
  })

  it("shows API error message", () => {
    const html = renderToStaticMarkup(
      <StockDocumentEditorView
        state={draftState}
        loading={false}
        saving={false}
        error="Document must have at least one line"
        saveMessage={null}
        onHeaderChange={() => {}}
        onAddLine={() => {}}
        onRemoveLine={() => {}}
        onLineChange={() => {}}
        onSave={() => {}}
      />
    )

    expect(html).toContain("Document must have at least one line")
  })

  it("shows read-only banner when not draft", () => {
    const html = renderToStaticMarkup(
      <StockDocumentEditorView
        state={{ ...draftState, status: "SUBMITTED", readOnly: true }}
        loading={false}
        saving={false}
        error={null}
        saveMessage={null}
        onHeaderChange={() => {}}
        onAddLine={() => {}}
        onRemoveLine={() => {}}
        onLineChange={() => {}}
        onSave={() => {}}
      />
    )

    expect(html).toContain("not a draft")
    expect(html).not.toContain("Save draft")
  })
})
