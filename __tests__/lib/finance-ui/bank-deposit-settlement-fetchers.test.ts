import {
  fetchBankDepositSettlementStatusList,
  postBankDepositSettlement,
} from "@/lib/finance-ui/bank-deposit-settlement"

describe("bank deposit settlement fetchers", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it("fetchBankDepositSettlementStatusList builds query from filter", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    })

    await fetchBankDepositSettlementStatusList({
      branchId: "branch-1",
      from: "2026-06-01",
      to: "2026-06-30",
    })

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/pos-settlement/bank-deposit/status-list?branchId=branch-1&from=2026-06-01&to=2026-06-30"
    )
  })

  it("postBankDepositSettlement posts collectorReportId", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        voucherId: "voucher-1",
        voucherNo: "V-2026-06-00002",
        collectNo: "COL-SH001-202606-0001",
        collectorReportId: "collector-report-1",
        amount: "1000.00",
      }),
    })

    await postBankDepositSettlement("collector-report-1")

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/pos-settlement/bank-deposit/post",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ collectorReportId: "collector-report-1" }),
      })
    )
  })
})
