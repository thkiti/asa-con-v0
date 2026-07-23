import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentEditorView } from "@/components/stock/StockDocumentEditorView"
import { getEditorWorkflowActions } from "@/lib/stock-ui/document-permissions"
import { filterEditorActionsForStockCountStaff } from "@/lib/stock-ui/stock-count-staff-mode"
import type { StockDocumentEditorStateVM } from "@/lib/stock-ui/editor-types"
import type { StockDocumentDetailVM } from "@/lib/stock-ui/types"

const sampleDetail: StockDocumentDetailVM = {
  id: "doc-1",
  refNo: "PERF-1",
  docType: "PERFORMANCE",
  status: "SUBMITTED",
  date: "2026-06-02T00:00:00.000Z",
  periodMonth: "2026-06",
  branchId: "branch-shop",
  legalEntityCode: "AS",
  fromLocId: "branch-shop",
  toLocId: null,
  submittedAt: "2026-06-02T12:00:00.000Z",
  confirmedAt: null,
  postedAt: null,
  createdByStaffId: "staff-1",
  confirmedByStaffId: null,
  postedByStaffId: null,
  cancelledAt: null,
  cancelledByStaffId: null,
  cancelReason: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  lines: [
    {
      id: "line-1",
      productId: "prod-1",
      qty: 2,
      endingQty: null,
      reviewPostingDelta: null,
      product: { id: "prod-1", code: "C1", name: "Item" },
    },
  ],
}

const draftState: StockDocumentEditorStateVM = {
  documentId: "doc-1",
  refNo: "PERF-1",
  docType: "PERFORMANCE",
  status: "DRAFT",
  date: "2026-06-02",
  branchId: "branch-shop",
  legalEntityCode: "AS",
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

function renderEditor(
  state: StockDocumentEditorStateVM,
  overrides?: Partial<{
    detailSnapshot: StockDocumentDetailVM | null
    saving: boolean
    actionBusy: import("@/lib/stock-ui/types").StockDocumentActionId | null
    error: string | null
    statusMessage: string | null
  }>
) {
  const actions = getEditorWorkflowActions(
    { role: "SH_STAFF", docType: state.docType, status: state.status },
    { hasDocumentId: Boolean(state.documentId) }
  )

  return renderToStaticMarkup(
    <StockDocumentEditorView
      state={state}
      detailSnapshot={overrides?.detailSnapshot ?? null}
      loading={false}
      saving={overrides?.saving ?? false}
      actionBusy={overrides?.actionBusy ?? null}
      actions={actions}
      error={overrides?.error ?? null}
      statusMessage={overrides?.statusMessage ?? null}
      countingMode={false}
      activeHookGroup="K"
      onHookGroupChange={() => {}}
      onHeaderChange={() => {}}
      onAddLine={() => {}}
      onRemoveLine={() => {}}
      onLineChange={() => {}}
      onWorkflowAction={() => {}}
    />
  )
}

describe("StockDocumentEditorView", () => {
  it("renders save and submit for DRAFT", () => {
    const html = renderEditor(draftState)
    expect(html).toContain("Save")
    expect(html).toContain("Submit")
    expect(html).not.toContain("Confirm")
    expect(html).not.toMatch(/>Print</)
    expect(html.match(/>Save</g)?.length).toBe(1)
    expect(html.match(/Back to list/g)?.length).toBe(1)
  })

  it("renders confirm, cancel, post, and print for SUBMITTED", () => {
    const html = renderEditor(
      {
        ...draftState,
        status: "SUBMITTED",
        readOnly: true,
      },
      { detailSnapshot: sampleDetail }
    )
    expect(html).toContain("Confirm")
    expect(html).toContain("Cancel")
    expect(html).toContain("Post")
    expect(html).toMatch(/>Print</)
    expect(html).not.toContain("Save")
    expect(html).toContain('class="print-only')
    expect(html).toContain("PERF-1")
  })

  it("renders cancel, post, and print for CONFIRMED", () => {
    const html = renderEditor(
      {
        ...draftState,
        status: "CONFIRMED",
        readOnly: true,
      },
      { detailSnapshot: { ...sampleDetail, status: "CONFIRMED" } }
    )
    expect(html).toContain("Cancel")
    expect(html).toMatch(/>Print</)
    expect(html).toMatch(/>Post</)
    expect(html).not.toContain("Submit")
  })

  it("shows print only for POSTED", () => {
    const html = renderEditor(
      {
        ...draftState,
        status: "POSTED",
        readOnly: true,
      },
      { detailSnapshot: { ...sampleDetail, status: "POSTED" } }
    )
    expect(html).not.toContain("Submit")
    expect(html).not.toContain("Confirm")
    expect(html).not.toContain("Cancel")
    expect(html).not.toMatch(/>Post</)
    expect(html).toMatch(/>Print</)
  })

  it("shows API error message", () => {
    const html = renderEditor(draftState, {
      error: "Document must have at least one line",
    })
    expect(html).toContain("Document must have at least one line")
  })

  it("shows submit loading label", () => {
    const html = renderEditor(draftState, { actionBusy: "submit" })
    expect(html).toContain("Submitting…")
  })

  it("shows post loading label", () => {
    const html = renderEditor(
      { ...draftState, status: "CONFIRMED", readOnly: true },
      { actionBusy: "post" }
    )
    expect(html).toContain("Posting…")
  })

  it("shows read-only banner when not draft", () => {
    const html = renderEditor({
      ...draftState,
      status: "SUBMITTED",
      readOnly: true,
    })
    expect(html).toContain("not a draft")
  })

  it("renders print lines from detailSnapshot not editor strings", () => {
    const html = renderEditor(
      {
        ...draftState,
        status: "SUBMITTED",
        readOnly: true,
        lines: [
          {
            key: "line-1",
            productId: "prod-1",
            productCode: "WRONG",
            productName: "Wrong name",
            qty: "999",
            endingQty: "",
            reviewPostingDelta: "",
          },
        ],
      },
      { detailSnapshot: sampleDetail }
    )
    expect(html).toContain("C1")
    expect(html).toContain("Item")
    const printLinesSection = html.match(
      /<section class="print-only">[\s\S]*?<\/section>/
    )?.[0]
    expect(printLinesSection).toBeDefined()
    expect(printLinesSection).not.toContain("WRONG")
    expect(printLinesSection).not.toContain("Wrong name")
    expect(printLinesSection).not.toContain("999")
  })

  it("renders counting sheet for ADJUSTMENT draft mode", () => {
    const html = renderToStaticMarkup(
      <StockDocumentEditorView
        state={{
          ...draftState,
          docType: "ADJUSTMENT",
          lines: [
            {
              key: "K-1",
              rowKey: "K-1",
              productId: "prod-k",
              productCode: "0101001",
              productName: "Home key",
              displayCode: "#K1",
              hookGroup: "K",
              hookNo: 1,
              hookLabel: "K.1",
              qty: "3",
              endingQty: "",
              reviewPostingDelta: "",
            },
          ],
        }}
        detailSnapshot={null}
        loading={false}
        saving={false}
        actionBusy={null}
        actions={getEditorWorkflowActions(
          { role: "SH_STAFF", docType: "ADJUSTMENT", status: "DRAFT" },
          { hasDocumentId: false }
        )}
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
      />
    )

    expect(html).toContain("ตรวจนับสต็อก — รายชิ้น")
    expect(html).toContain("กุญแจบ้าน")
    expect(html).toContain("#K1")
    expect(html).toContain("สรุปตามกลุ่มสินค้า")
    expect(html).not.toContain("Product ID")
    expect(html).toContain(">ชื่อ<")
    expect(html).toContain('role="tablist"')
    expect(html).toContain(">Save<")
    expect(html).toContain(">Submit<")
    expect(html).toContain("Back to list")
    expect(html.match(/>Save</g)?.length).toBe(1)
    const toolbarSection = html.match(
      /flex flex-wrap items-center justify-between gap-4[\s\S]*?lg:grid-cols-4/
    )?.[0]
    expect(toolbarSection).toBeDefined()
    expect(toolbarSection).toContain('role="tablist"')
    expect(toolbarSection).toContain(">Save<")
  })

  it("renders stock count staff mode with compact heading and limited toolbar", () => {
    const adjustmentDraft: StockDocumentEditorStateVM = {
      ...draftState,
      docType: "ADJUSTMENT",
      refNo: "ADJ-SH001-202606-0001",
      date: "2026-06-10",
      lines: [
        {
          key: "K-1",
          rowKey: "K-1",
          productId: "prod-k",
          productCode: "0101001",
          productName: "Home key",
          displayCode: "#K1",
          hookGroup: "K",
          hookNo: 1,
          hookLabel: "K.1",
          qty: "3",
          endingQty: "",
          reviewPostingDelta: "",
        },
      ],
    }

    const baseActions = getEditorWorkflowActions(
      { role: "SH_STAFF", docType: "ADJUSTMENT", status: "DRAFT" },
      { hasDocumentId: true }
    )
    const staffActions = filterEditorActionsForStockCountStaff(baseActions)

    const html = renderToStaticMarkup(
      <StockDocumentEditorView
        state={adjustmentDraft}
        detailSnapshot={null}
        loading={false}
        saving={false}
        actionBusy={null}
        actions={staffActions}
        error={null}
        statusMessage={null}
        countingMode
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
      />
    )

    const identityLine =
      "ตรวจนับสต๊อก • CNT-SH001-202606-0001 • SH001 • Chidlom • 103 • Somsak Kamnuch • 2026.06.10"
    expect(html).toContain(identityLine)
    expect(html).not.toContain("ADJ-SH001-202606-0001")
    expect(html).toContain("stock-count-header-box")
    expect(html).toContain("stock-count-header-box__identity")
    expect(html).toContain("stock-count-header-box__controls")
    expect(html).toContain("stock-count-workspace-box")
    expect(html).toContain("stock-count-staff-sheet")
    expect(html).toContain("gap-3")
    expect(html).toContain("max-h-[4.5rem]")
    expect(html).toContain("flex-nowrap")
    expect(html).toContain("overflow-y-auto")
    expect(html).not.toContain("stock-count-metadata-label")
    expect(html).not.toContain("stock-count-toolbar-block")
    expect(html).not.toContain("Document header")
    expect(html).not.toContain("Confirm")
    expect(html).not.toContain("Post")
    expect(html).not.toMatch(/>Print</)
    expect(html).not.toContain("Back to list")
    expect(html).not.toContain("ตรวจนับสต็อก — รายชิ้น")
    expect(html).toContain("stock-count-staff-mode")
    const identityRow = html.match(
      /stock-count-header-box__identity[^>]*>[\s\S]*?<\/p>/
    )?.[0]
    expect(identityRow).toBeDefined()
    expect(identityRow).toContain(identityLine)
    expect(identityRow).not.toContain("Save</button>")
    const controlsRow = html.match(
      /stock-count-header-box__controls[\s\S]*?href="\/shop"[^>]*>Back<\/a>/
    )?.[0]
    expect(controlsRow).toBeDefined()
    expect(controlsRow).toContain('role="tablist"')
    expect(controlsRow).toContain("Save</button>")
    expect(controlsRow).toContain("Submit</button>")
    expect(controlsRow).toContain("stock-count-staff-action")
    expect(controlsRow).toContain("border-zinc-900")
    expect(controlsRow).toContain("hover:bg-zinc-900")
    expect(controlsRow).toContain("hover:text-white")
    expect(controlsRow).not.toMatch(/Save[\s\S]*?bg-zinc-900 text-white/)
    expect(controlsRow).toContain("1 รายการ กลุ่ม K")
    expect(controlsRow).not.toContain("Items:")
  })

  it("renders transfer-out staff order sheet with ORDER labeling and ASAS • ORD", () => {
    const transferDraft: StockDocumentEditorStateVM = {
      ...draftState,
      docType: "TRANSFER_OUT",
      refNo: "TRO-SH001-202606-0002",
      date: "2026-06-10",
      lines: [
        {
          key: "K-1",
          rowKey: "K-1",
          productId: "prod-k",
          productCode: "0101001",
          productName: "Home key",
          displayCode: "#K1",
          hookGroup: "K",
          hookNo: 1,
          hookLabel: "K.1",
          qty: "1",
          endingQty: "",
          reviewPostingDelta: "",
        },
      ],
    }

    const staffActions = filterEditorActionsForStockCountStaff(
      getEditorWorkflowActions(
        { role: "SH_STAFF", docType: "TRANSFER_OUT", status: "DRAFT" },
        { hasDocumentId: false }
      )
    )

    const html = renderToStaticMarkup(
      <StockDocumentEditorView
        state={transferDraft}
        detailSnapshot={null}
        loading={false}
        saving={false}
        actionBusy={null}
        actions={staffActions}
        error={null}
        statusMessage={null}
        countingMode={false}
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

    expect(html).toContain("ASAS • ORD")
    expect(html).toContain(
      "ใบสั่งของ • ORD-SH001-202606-0002 • SH001 • Chidlom • 103 • Somsak Kamnuch • 2026.06.10"
    )
    expect(html).not.toContain("ORDER —")
    expect(html).not.toContain("| SH001")
    expect(html).toContain("stock-count-staff-sheet")
    expect(html).not.toContain("Document header")
    expect(html).not.toContain("From location")
    expect(html).not.toContain("Product UUID")
  })

  it("renders sparse lines table for submitted adjustment", () => {
    const html = renderEditor(
      {
        ...draftState,
        docType: "ADJUSTMENT",
        status: "SUBMITTED",
        readOnly: true,
      },
      { detailSnapshot: { ...sampleDetail, docType: "ADJUSTMENT" } }
    )

    expect(html).toContain("Lines")
    expect(html).not.toContain("ตรวจนับสต็อก")
  })
})
