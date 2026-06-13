/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentEditorView } from "@/components/stock/StockDocumentEditorView"
import { filterEditorActionsForStockCountStaff } from "@/lib/stock-ui/stock-count-staff-mode"
import { getEditorWorkflowActions } from "@/lib/stock-ui/document-permissions"
import type { StockDocumentEditorStateVM } from "@/lib/stock-ui/editor-types"

function renderPosStaffEditor(state: StockDocumentEditorStateVM) {
  const staffActions = filterEditorActionsForStockCountStaff(
    getEditorWorkflowActions(
      { role: "SH_STAFF", docType: state.docType, status: state.status },
      { hasDocumentId: Boolean(state.documentId) }
    )
  )

  return renderToStaticMarkup(
    <StockDocumentEditorView
      state={state}
      detailSnapshot={null}
      loading={false}
      saving={false}
      actionBusy={null}
      actions={staffActions}
      error={null}
      statusMessage={null}
      countingMode={state.docType === "ADJUSTMENT"}
      staffOperationalSheet
      activeHookGroup="K"
      onHookGroupChange={() => {}}
      onHeaderChange={() => {}}
      onAddLine={() => {}}
      onRemoveLine={() => {}}
      onLineChange={() => {}}
      onWorkflowAction={() => {}}
      stockCountStaffMode
      staffHeader={{
        branchCode: "SH001",
        branchName: "Chidlom",
        staffCode: "103",
        staffName: "Somsak Kamnuch",
      }}
      viewerEntityCode="AS"
    />
  )
}

describe("full-pos stock document ref display", () => {
  it("shows business CNT ref after POS stock count open with stored ADJ ref", () => {
    const html = renderPosStaffEditor({
      documentId: "doc-adj-1",
      refNo: "ADJ-SH001-202606-0001",
      docType: "ADJUSTMENT",
      status: "DRAFT",
      date: "2026-06-10",
      branchId: "branch-shop",
      fromLocId: "branch-shop",
      toLocId: "",
      readOnly: false,
      lines: [],
    })

    expect(html).toContain("ASAS • CNT")
    expect(html).toContain("CNT-SH001-202606-0001")
    expect(html).not.toContain("ADJ-SH001-202606-0001")
    expect(html).not.toContain("Document header")
  })

  it("shows business ORD ref after POS order open with stored TRO ref", () => {
    const html = renderPosStaffEditor({
      documentId: "doc-tro-1",
      refNo: "TRO-SH001-202606-0001",
      docType: "TRANSFER_OUT",
      status: "DRAFT",
      date: "2026-06-12",
      branchId: "branch-shop",
      fromLocId: "branch-shop",
      toLocId: "",
      readOnly: false,
      lines: [],
    })

    expect(html).toContain("ASAS • ORD")
    expect(html).toContain(
      "ใบสั่งของ • ORD-SH001-202606-0001 • SH001 • Chidlom • 103 • Somsak Kamnuch • 2026.06.12"
    )
    expect(html).not.toContain("ใบสั่งของ • — •")
    expect(html).not.toContain("TRO-SH001-202606-0001")
    expect(html).not.toContain("Document header")
  })
})
