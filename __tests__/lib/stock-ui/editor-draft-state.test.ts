import {
  addEditorLine,
  applyCountingSaveToEditorState,
  createDraftEditorState,
  detailToEditorState,
  editorStateToSavePayload,
  hydrateCountingEditorState,
  isCountingEditorMode,
  mergedRowsToEditorLines,
  postSaveEditorPath,
  removeEditorLine,
  updateEditorLine,
} from "@/lib/stock-ui/editor-draft-state"
import type { StockDocumentDetailVM } from "@/lib/stock-ui/types"
import type { StockInputRowVM } from "@/lib/stock-ui/stock-input-list"

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

  it("isCountingEditorMode is true only for ADJUSTMENT draft", () => {
    const draft = createDraftEditorState("ADJUSTMENT", "b1")
    expect(isCountingEditorMode(draft)).toBe(true)

    const submitted = detailToEditorState({
      ...sampleDetail,
      docType: "ADJUSTMENT",
      status: "SUBMITTED",
    })
    expect(isCountingEditorMode(submitted)).toBe(false)
  })

  it("hydrateCountingEditorState builds full master lines from merge result", () => {
    const inputRow: StockInputRowVM = {
      rowKey: "K-1",
      sourceType: "REFERENCE",
      referenceStockId: "ref-1",
      productId: "prod-1",
      productCode: "0101001",
      productName: "Key",
      hookGroup: "K",
      hookNo: 1,
      hookLabel: "K.1",
      supplierCode: "#K1",
      displayCode: "#K1",
      displayName: "Key",
      productGroup: "0101900",
      groupCode: "0101900",
      sortKey: "x",
    }

    const state = hydrateCountingEditorState(
      {
        documentId: null,
        refNo: null,
        docType: "ADJUSTMENT",
        status: "DRAFT",
        date: "2026-06-02",
        branchId: "branch-shop",
        fromLocId: "branch-shop",
        toLocId: "",
      },
      {
        rows: [
          {
            ...inputRow,
            qty: "4",
            endingQty: "",
            reviewPostingDelta: "",
            isOrphan: false,
          },
        ],
        orphans: [],
      }
    )

    expect(state.lines).toHaveLength(1)
    expect(state.lines[0]).toMatchObject({
      key: "K-1",
      productId: "prod-1",
      displayCode: "#K1",
      hookGroup: "K",
      productGroup: "0101900",
      qty: "4",
    })
    expect(mergedRowsToEditorLines).toBeDefined()
  })

  it("editorStateToSavePayload filters zero-qty counting rows", () => {
    const state = hydrateCountingEditorState(
      {
        documentId: "doc-1",
        refNo: "ADJ-1",
        docType: "ADJUSTMENT",
        status: "DRAFT",
        date: "2026-06-02",
        branchId: "branch-shop",
        fromLocId: "branch-shop",
        toLocId: "",
      },
      {
        rows: [
          {
            rowKey: "K-1",
            sourceType: "REFERENCE",
            referenceStockId: "ref-1",
            productId: "prod-1",
            productCode: "0101001",
            productName: "Key",
            hookGroup: "K",
            hookNo: 1,
            hookLabel: "K.1",
            supplierCode: "#K1",
            displayCode: "#K1",
            displayName: "Key",
            productGroup: null,
            groupCode: null,
            sortKey: "x",
            qty: "5",
            endingQty: "",
            reviewPostingDelta: "",
            isOrphan: false,
          },
          {
            rowKey: "K-2",
            sourceType: "REFERENCE",
            referenceStockId: "ref-2",
            productId: "prod-2",
            productCode: "0101002",
            productName: "Key 2",
            hookGroup: "K",
            hookNo: 2,
            hookLabel: "K.2",
            supplierCode: "#K2",
            displayCode: "#K2",
            displayName: "Key 2",
            productGroup: null,
            groupCode: null,
            sortKey: "y",
            qty: "",
            endingQty: "",
            reviewPostingDelta: "",
            isOrphan: false,
          },
        ],
        orphans: [],
      }
    )

    const payload = editorStateToSavePayload(state, "staff-1")
    expect(payload.lines).toEqual([
      { productId: "prod-1", qty: 5, reviewPostingDelta: 5 },
    ])
  })

  it("editorStateToSavePayload sets reviewPostingDelta = qty for opening-count ADJUSTMENT (G1)", () => {
    const state = hydrateCountingEditorState(
      {
        documentId: "doc-1",
        refNo: "ADJ-1",
        docType: "ADJUSTMENT",
        status: "DRAFT",
        date: "2026-06-10",
        branchId: "branch-shop",
        fromLocId: "branch-shop",
        toLocId: "",
      },
      {
        rows: [
          {
            rowKey: "K-1",
            sourceType: "REFERENCE",
            referenceStockId: "ref-1",
            productId: "prod-1",
            productCode: "0101001",
            productName: "Key",
            hookGroup: "K",
            hookNo: 1,
            hookLabel: "K.1",
            supplierCode: "#K1",
            displayCode: "#K1",
            displayName: "Key",
            productGroup: null,
            groupCode: null,
            sortKey: "x",
            qty: "100",
            endingQty: "",
            reviewPostingDelta: "",
            isOrphan: false,
          },
        ],
        orphans: [],
      }
    )

    const payload = editorStateToSavePayload(state, "staff-1")
    expect(payload.lines).toEqual([
      { productId: "prod-1", qty: 100, reviewPostingDelta: 100 },
    ])
  })

  it("editorStateToSavePayload does not set reviewPostingDelta for non-counting PERFORMANCE", () => {
    const state = detailToEditorState(sampleDetail)
    const payload = editorStateToSavePayload(state, "staff-1")
    expect(payload.lines[0]).toEqual(
      expect.objectContaining({ productId: "prod-1", qty: 3 })
    )
    expect(payload.lines[0]?.reviewPostingDelta).toBeNull()
  })

  it("applyCountingSaveToEditorState keeps master lines after save", () => {
    const state = hydrateCountingEditorState(
      {
        documentId: null,
        refNo: null,
        docType: "ADJUSTMENT",
        status: "DRAFT",
        date: "2026-06-02",
        branchId: "branch-shop",
        fromLocId: "branch-shop",
        toLocId: "",
      },
      {
        rows: [
          {
            rowKey: "K-1",
            sourceType: "REFERENCE",
            referenceStockId: "ref-1",
            productId: "prod-1",
            productCode: "0101001",
            productName: "Key",
            hookGroup: "K",
            hookNo: 1,
            hookLabel: "K.1",
            supplierCode: "#K1",
            displayCode: "#K1",
            displayName: "Key",
            productGroup: null,
            groupCode: null,
            sortKey: "x",
            qty: "2",
            endingQty: "",
            reviewPostingDelta: "",
            isOrphan: false,
          },
        ],
        orphans: [],
      }
    )

    const saved: StockDocumentDetailVM = {
      ...sampleDetail,
      id: "doc-new",
      refNo: "ADJ-NEW",
      docType: "ADJUSTMENT",
      lines: [
        {
          id: "line-1",
          productId: "prod-1",
          qty: 2,
          endingQty: null,
          reviewPostingDelta: null,
          product: { id: "prod-1", code: "0101001", name: "Key" },
        },
      ],
    }

    const next = applyCountingSaveToEditorState(state, saved)
    expect(next.documentId).toBe("doc-new")
    expect(next.lines).toHaveLength(1)
    expect(next.lines[0]?.qty).toBe("2")
  })
})
