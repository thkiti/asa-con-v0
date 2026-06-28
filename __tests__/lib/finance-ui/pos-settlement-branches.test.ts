import {
  fetchPosSettlementBranches,
  formatPosSettlementBranchLabel,
} from "@/lib/finance-ui/pos-settlement-branches"

describe("pos settlement branch fetchers", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it("fetchPosSettlementBranches calls finance branches API", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: "branch-sh001", code: "SH001", name: "Chidlom" }],
      }),
    })

    const result = await fetchPosSettlementBranches()

    expect(global.fetch).toHaveBeenCalledWith("/api/finance/pos-settlement/branches")
    expect(result.items).toHaveLength(1)
    expect(formatPosSettlementBranchLabel(result.items[0]!)).toBe("SH001 • Chidlom")
  })
})
