import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentEditorView } from "@/components/stock/StockDocumentEditorView"
import { getEditorWorkflowActions } from "@/lib/stock-ui/document-permissions"
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

  it("renders counting grid for ADJUSTMENT draft mode", () => {
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

    expect(html).toContain("Stock count")
    expect(html).toContain("Home Key")
    expect(html).toContain("#K1")
    expect(html).not.toContain("Product ID")
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
    expect(html).not.toContain("Stock count")
  })
})
