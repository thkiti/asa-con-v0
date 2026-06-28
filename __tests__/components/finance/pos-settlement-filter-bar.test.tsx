import { renderToStaticMarkup } from "react-dom/server"
import { PosSettlementFilterBar } from "@/components/finance/PosSettlementFilterBar"
import { formatPosSettlementBranchLabel } from "@/lib/finance-ui/pos-settlement-branches"

describe("formatPosSettlementBranchLabel", () => {
  it("formats code and name with bullet separator", () => {
    expect(
      formatPosSettlementBranchLabel({ code: "SH001", name: "Chidlom" })
    ).toBe("SH001 • Chidlom")
  })
})

describe("PosSettlementFilterBar", () => {
  it("renders branch dropdown instead of text input", () => {
    const html = renderToStaticMarkup(
      <PosSettlementFilterBar
        values={{ from: "2026-06-01", to: "2026-06-30" }}
        onChange={() => undefined}
        onApply={() => undefined}
      />
    )

    expect(html).toContain('data-testid="pos-settlement-branch-select"')
    expect(html).toContain("<select")
    expect(html).not.toContain('placeholder="Optional"')
    expect(html).not.toContain("Branch ID")
    expect(html).toContain("All SH branches")
  })
})

describe("fetchPosSettlementBranches usage in status-list", () => {
  it("sends branchId when branch selected", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    })

    const { fetchCollectorPickupSettlementStatusList } = await import(
      "@/lib/finance-ui/collector-pickup-settlement"
    )

    await fetchCollectorPickupSettlementStatusList({
      branchId: "branch-sh001",
      from: "2026-06-01",
      to: "2026-06-30",
    })

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/pos-settlement/collector-pickup/status-list?branchId=branch-sh001&from=2026-06-01&to=2026-06-30"
    )
  })
})
