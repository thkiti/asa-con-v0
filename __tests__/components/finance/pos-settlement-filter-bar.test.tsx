import { renderToStaticMarkup } from "react-dom/server"
import {
  FinanceSettlementDateInput,
  financeSettlementDateInputClass,
} from "@/components/finance/FinanceSettlementDateInput"
import { PosSettlementFilterBar } from "@/components/finance/PosSettlementFilterBar"
import { formatPosSettlementBranchLabel } from "@/lib/finance-ui/pos-settlement-branches"
import { themeInput } from "@/lib/theme/theme-classes"

describe("formatPosSettlementBranchLabel", () => {
  it("formats code and name with bullet separator", () => {
    expect(
      formatPosSettlementBranchLabel({ code: "SH001", name: "Chidlom" })
    ).toBe("SH001 • Chidlom")
  })
})

describe("FinanceSettlementDateInput", () => {
  it("renders a theme-aware native date picker", () => {
    const html = renderToStaticMarkup(
      <FinanceSettlementDateInput
        label="From"
        value="2026-06-01"
        onChange={() => undefined}
        data-testid="pos-settlement-date-from"
      />
    )

    expect(html).toContain('type="date"')
    expect(html).toContain('value="2026-06-01"')
    expect(html).toContain('data-testid="pos-settlement-date-from"')
    expect(html).toContain(financeSettlementDateInputClass)
    expect(html).toContain(themeInput)
    expect(html).toContain("finance-settlement-date-input")
  })
})

describe("PosSettlementFilterBar", () => {
  it("renders branch dropdown and theme-aware date pickers", () => {
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
    expect(html).toContain('data-testid="pos-settlement-date-from"')
    expect(html).toContain('data-testid="pos-settlement-date-to"')
    expect(html).toContain('value="2026-06-01"')
    expect(html).toContain('value="2026-06-30"')
    expect(html).toContain('type="date"')
    expect(html).toContain("finance-settlement-date-input")
  })
})

describe("fetchPosSettlementBranches usage in status-list", () => {
  it("sends branchId and YYYY-MM-DD dates when filters applied", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    })

    const { fetchCollectorPickupSettlementStatusList } = await import(
      "@/lib/finance-ui/collector-pickup-settlement"
    )
    const { fetchBankDepositSettlementStatusList } = await import(
      "@/lib/finance-ui/bank-deposit-settlement"
    )

    const filter = {
      branchId: "branch-sh001",
      from: "2026-06-01",
      to: "2026-06-30",
    }

    await fetchCollectorPickupSettlementStatusList(filter)
    await fetchBankDepositSettlementStatusList(filter)

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/pos-settlement/collector-pickup/status-list?branchId=branch-sh001&from=2026-06-01&to=2026-06-30"
    )
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/pos-settlement/bank-deposit/status-list?branchId=branch-sh001&from=2026-06-01&to=2026-06-30"
    )
  })
})
