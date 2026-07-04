import { financeScopedFetch } from "@/lib/finance-ui/finance-entity-scope"
import { fetchBankCashJournal } from "@/lib/finance-ui/bank-cash-journal"

jest.mock("@/lib/finance-ui/finance-entity-scope", () => ({
  financeScopedFetch: jest.fn(),
}))

const mockFetch = financeScopedFetch as jest.Mock

describe("fetchBankCashJournal", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("appends legalEntityCode to API request", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        journal: {
          legalEntityCode: "AS",
          periodKey: "2026-01",
          beginningBalance: "0.00",
          endingBalance: "0.00",
          lines: [],
        },
      }),
    })

    await fetchBankCashJournal("AS", {
      periodKey: "2026-01",
      bankAccountId: "bank-1",
    })

    expect(mockFetch).toHaveBeenCalledWith(
      "AS",
      "/api/finance/bank-cash-journal?periodKey=2026-01&bankAccountId=bank-1",
      { cache: "no-store" }
    )
  })
})
