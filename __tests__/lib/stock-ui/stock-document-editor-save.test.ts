import { saveStockDocumentEditor } from "@/lib/stock-ui/stock-document-editor-save"
import { createDraftEditorState, updateEditorLine } from "@/lib/stock-ui/editor-draft-state"
import { saveStockDocument } from "@/lib/stock-ui/fetchers"

jest.mock("@/lib/stock-ui/fetchers", () => ({
  saveStockDocument: jest.fn(),
}))

const mockedSave = saveStockDocument as jest.MockedFunction<typeof saveStockDocument>

describe("saveStockDocumentEditor", () => {
  beforeEach(() => {
    mockedSave.mockReset()
  })

  it("calls saveStockDocument with payload from editor state", async () => {
    const state = createDraftEditorState("PERFORMANCE", "branch-shop")
    const key = state.lines[0]!.key
    const edited = {
      ...state,
      lines: updateEditorLine(state.lines, key, {
        productId: "prod-99",
        qty: "5",
      }),
    }

    mockedSave.mockResolvedValue({
      id: "doc-saved",
      refNo: "PERF-NEW",
      docType: "PERFORMANCE",
      status: "DRAFT",
      date: "2026-06-02T00:00:00.000Z",
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
          id: "line-new",
          productId: "prod-99",
          qty: 5,
          endingQty: null,
          reviewPostingDelta: null,
          product: { id: "prod-99", code: "prod-99", name: "prod-99" },
        },
      ],
    })

    const result = await saveStockDocumentEditor(edited, "staff-1", edited.lines)

    expect(mockedSave).toHaveBeenCalledWith(
      expect.objectContaining({
        docType: "PERFORMANCE",
        branchId: "branch-shop",
        createdByStaffId: "staff-1",
        lines: [expect.objectContaining({ productId: "prod-99", qty: 5 })],
      })
    )
    expect(result.id).toBe("doc-saved")
    expect(result.lines[0]?.product.code).toBe("")
  })
})
