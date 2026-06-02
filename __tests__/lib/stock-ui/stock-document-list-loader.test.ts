import { loadStockDocumentListPage } from "@/lib/stock-ui/stock-document-list-loader"
import { fetchStockDocumentList } from "@/lib/stock-ui/fetchers"

jest.mock("@/lib/stock-ui/fetchers", () => ({
  fetchStockDocumentList: jest.fn(),
}))

const mockedFetch = fetchStockDocumentList as jest.MockedFunction<
  typeof fetchStockDocumentList
>

describe("loadStockDocumentListPage", () => {
  beforeEach(() => {
    mockedFetch.mockReset()
  })

  it("calls fetchStockDocumentList with branch and limit", async () => {
    mockedFetch.mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
    })

    await loadStockDocumentListPage({ branchId: "branch-shop" })

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: "branch-shop",
        limit: 50,
      })
    )
  })

  it("passes cursor for pagination", async () => {
    mockedFetch.mockResolvedValue({
      items: [],
      nextCursor: "cursor-2",
      hasMore: true,
    })

    await loadStockDocumentListPage(
      { branchId: "branch-shop", status: "DRAFT" },
      "cursor-1"
    )

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: "cursor-1",
        status: "DRAFT",
      })
    )
  })
})
