import {
  addEditorLine,
  createDraftEditorState,
  detailToEditorState,
  editorStateToSavePayload,
  postSaveEditorPath,
  removeEditorLine,
  updateEditorLine,
} from "@/lib/stock-ui/editor-draft-state"
import type { StockDocumentDetailVM } from "@/lib/stock-ui/types"

const sampleDetail: StockDocumentDetailVM = {
  id: "doc-abc",
  refNo: "PERF-001",
  docType: "PERFORMANCE",
  status: "DRAFT",
  date: "2026-06-01T00:00:00.000Z",
  periodMonth: "2026-06",
  branchId: "branch-shop",
  fromLocId: "branch-shop",
  toLocId: null,
  submittedAt: null,
  confirmedAt: null,
  postedAt: null,
  cancelledAt: null,
  lines: [
    {
      id: "line-1",
      productId: "prod-1",
      qty: 3,
      endingQty: null,
      reviewPostingDelta: null,
      product: { id: "prod-1", code: "P1", name: "Product 1" },
    },
  ],
}

describe("editor-draft-state", () => {
  it("createDraftEditorState seeds shop branch and one line", () => {
    const state = createDraftEditorState("TRANSFER_OUT", "branch-shop")
    expect(state.documentId).toBeNull()
    expect(state.docType).toBe("TRANSFER_OUT")
    expect(state.status).toBe("DRAFT")
    expect(state.readOnly).toBe(false)
    expect(state.fromLocId).toBe("branch-shop")
    expect(state.lines).toHaveLength(1)
  })

  it("detailToEditorState marks non-draft as read-only", () => {
    const submitted: StockDocumentDetailVM = {
      ...sampleDetail,
      status: "SUBMITTED",
    }
    const state = detailToEditorState(submitted)
    expect(state.readOnly).toBe(true)
    expect(state.lines[0]?.productCode).toBe("P1")
  })

  it("addEditorLine and removeEditorLine update rows", () => {
    const base = createDraftEditorState("ADJUSTMENT", "b1")
    const withExtra = { ...base, lines: addEditorLine(base.lines) }
    expect(withExtra.lines).toHaveLength(2)

    const key = withExtra.lines[0]!.key
    const afterRemove = {
      ...withExtra,
      lines: removeEditorLine(withExtra.lines, key),
    }
    expect(afterRemove.lines).toHaveLength(1)
    expect(afterRemove.lines[0]?.key).not.toBe(key)
  })

  it("updateEditorLine patches qty", () => {
    const base = createDraftEditorState("PERFORMANCE", "b1")
    const key = base.lines[0]!.key
    const next = {
      ...base,
      lines: updateEditorLine(base.lines, key, { qty: "12" }),
    }
    expect(next.lines[0]?.qty).toBe("12")
  })

  it("editorStateToSavePayload maps lines for API", () => {
    const state = detailToEditorState(sampleDetail)
    const payload = editorStateToSavePayload(state, "staff-1")
    expect(payload.id).toBe("doc-abc")
    expect(payload.createdByStaffId).toBe("staff-1")
    expect(payload.lines).toEqual([
      expect.objectContaining({ productId: "prod-1", qty: 3 }),
    ])
  })

  it("postSaveEditorPath returns edit URL only for create mode", () => {
    expect(postSaveEditorPath("create", "doc-new")).toBe("/shop/stock-documents/doc-new")
    expect(postSaveEditorPath("edit", "doc-new")).toBeNull()
  })
})
