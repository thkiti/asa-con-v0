import {
  fetchCollectorPickupSettlementStatusList,
  postCollectorPickupSettlement,
} from "@/lib/finance-ui/collector-pickup-settlement"

describe("collector pickup settlement fetchers", () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as typeof fetch
  })

  it("calls status-list API with date and branch filters", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    })

    await fetchCollectorPickupSettlementStatusList({
      branchId: "branch-1",
      from: "2026-06-01",
      to: "2026-06-30",
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/finance/pos-settlement/collector-pickup/status-list?branchId=branch-1&from=2026-06-01&to=2026-06-30"
    )
  })

  it("calls post API with collectorReportId", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        voucherId: "voucher-1",
        voucherNo: "V-2026-06-00001",
        collectNo: "COL-SH001-202606-0001",
        collectorReportId: "collector-report-1",
        amount: "1000.00",
      }),
    })

    await postCollectorPickupSettlement("collector-report-1")

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/finance/pos-settlement/collector-pickup/post",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ collectorReportId: "collector-report-1" }),
      })
    )
  })
})
