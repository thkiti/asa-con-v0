import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentEditorView } from "@/components/stock/StockDocumentEditorView"
import { getEditorWorkflowActions } from "@/lib/stock-ui/document-permissions"
import type { StockDocumentEditorStateVM } from "@/lib/stock-ui/editor-types"

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
      loading={false}
      saving={overrides?.saving ?? false}
      actionBusy={overrides?.actionBusy ?? null}
      actions={actions}
      error={overrides?.error ?? null}
      statusMessage={overrides?.statusMessage ?? null}
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
  })

  it("renders confirm, cancel, and post for SUBMITTED", () => {
    const html = renderEditor({
      ...draftState,
      status: "SUBMITTED",
      readOnly: true,
    })
    expect(html).toContain("Confirm")
    expect(html).toContain("Cancel")
    expect(html).toContain("Post")
    expect(html).not.toContain("Save")
  })

  it("renders cancel and post for CONFIRMED", () => {
    const html = renderEditor({
      ...draftState,
      status: "CONFIRMED",
      readOnly: true,
    })
    expect(html).toContain("Cancel")
    expect(html).toContain("Post")
    expect(html).not.toContain("Submit")
  })

  it("shows no workflow buttons for POSTED", () => {
    const html = renderEditor({
      ...draftState,
      status: "POSTED",
      readOnly: true,
    })
    expect(html).not.toContain("Submit")
    expect(html).not.toContain("Confirm")
    expect(html).not.toContain("Cancel")
    expect(html).not.toMatch(/>Post</)
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
})
