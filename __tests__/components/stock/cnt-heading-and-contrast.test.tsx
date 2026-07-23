/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentEditorView } from "@/components/stock/StockDocumentEditorView"
import { countingCellCodeClass, countingCellHookClass } from "@/components/stock/counting-sheet-styles"
import { formatStaffFacingDocumentTitle } from "@/lib/stock-ui/format"
import type { StockDocumentEditorStateVM } from "@/lib/stock-ui/editor-types"

describe("CNT heading uses document legalEntityCode", () => {
  it("formats ASAD • CNT for AD adjustment draft", () => {
    expect(
      formatStaffFacingDocumentTitle("ADJUSTMENT", "DRAFT", "AD")
    ).toBe("ASAD • CNT")
  })

  it("formats ASAS • CNT for AS adjustment draft", () => {
    expect(
      formatStaffFacingDocumentTitle("ADJUSTMENT", "DRAFT", "AS")
    ).toBe("ASAS • CNT")
  })

  it("editor phase title prefers state.legalEntityCode AD over session AS", () => {
    const state: StockDocumentEditorStateVM = {
      documentId: "doc-1",
      refNo: "CNT-1",
      docType: "ADJUSTMENT",
      status: "DRAFT",
      date: "2026-01-15",
      branchId: "ho-1",
      legalEntityCode: "AD",
      fromLocId: "ho-1",
      toLocId: "",
      readOnly: false,
      lines: [
        {
          key: "l1",
          productId: "p1",
          productCode: "SKU-1",
          productName: "Boot",
          qty: "1",
          endingQty: "1",
          reviewPostingDelta: "",
          hookGroup: "K",
          hookNo: 1,
          displayCode: "01",
        },
      ],
    }

    const html = renderToStaticMarkup(
      <StockDocumentEditorView
        state={state}
        detailSnapshot={null}
        loading={false}
        saving={false}
        actionBusy={null}
        actions={[]}
        error={null}
        statusMessage={null}
        countingMode
        activeHookGroup="K"
        onHookGroupChange={() => {}}
        onHeaderChange={() => {}}
        onAddLine={() => {}}
        onRemoveLine={() => {}}
        onLineChange={() => {}}
        onWorkflowAction={() => {}}
        viewerEntityCode="AS"
      />
    )

    expect(html).toContain("ASAD • CNT")
    expect(html).not.toContain("ASAS • CNT")
  })
})

describe("CNT counting cell contrast classes", () => {
  it("Hook and Product Code use theme-remapped zinc-900 text", () => {
    expect(countingCellHookClass).toContain("text-zinc-900")
    expect(countingCellCodeClass).toContain("text-zinc-900")
    expect(countingCellHookClass).not.toContain("text-zinc-950")
    expect(countingCellCodeClass).not.toContain("text-zinc-950")
  })
})
