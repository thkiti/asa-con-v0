import {
  loadCountingEditorStateForCreate,
  loadCountingEditorStateForEdit,
} from "@/lib/stock-ui/counting-editor-load"
import { fetchStockInputList } from "@/lib/stock-ui/fetchers"
import type { StockDocumentDetailVM } from "@/lib/stock-ui/types"

jest.mock("@/lib/stock-ui/fetchers", () => ({
  fetchStockInputList: jest.fn(),
}))

const mockedFetchInputList = fetchStockInputList as jest.MockedFunction<
  typeof fetchStockInputList
>

const sampleInputRows = [
  {
    rowKey: "K-1",
    sourceType: "REFERENCE" as const,
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
  },
]

describe("counting-editor-load", () => {
  beforeEach(() => {
    mockedFetchInputList.mockReset()
    mockedFetchInputList.mockResolvedValue(sampleInputRows)
  })

  it("loadCountingEditorStateForCreate hydrates master rows with empty qty", async () => {
    const result = await loadCountingEditorStateForCreate("branch-shop")

    expect(result.state.docType).toBe("ADJUSTMENT")
    expect(result.state.lines).toHaveLength(1)
    expect(result.state.lines[0]?.qty).toBe("")
    expect(result.orphans).toEqual([])
  })

  it("loadCountingEditorStateForEdit overlays saved qty", async () => {
    const detail: StockDocumentDetailVM = {
      id: "doc-1",
      refNo: "ADJ-1",
      docType: "ADJUSTMENT",
      status: "DRAFT",
      date: "2026-06-02T00:00:00.000Z",
      periodMonth: "2026-06",
      branchId: "branch-shop",
      fromLocId: "branch-shop",
      toLocId: null,
      submittedAt: null,
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
          qty: 9,
          endingQty: null,
          reviewPostingDelta: null,
          product: { id: "prod-1", code: "0101001", name: "Key" },
        },
      ],
    }

    const result = await loadCountingEditorStateForEdit(detail)
    expect(result.state.lines[0]?.qty).toBe("9")
  })
})
