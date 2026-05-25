import { buildReconciliationQuery } from "@/lib/finance-ui/fetchers"
import type { FinanceFilterValues } from "@/lib/finance-ui/types"

describe("FinanceFilterBar query integration", () => {
  it("builds query from typical filter bar values", () => {
    const values: FinanceFilterValues = {
      branchId: "branch-42",
      from: "2026-05-01",
      to: "2026-05-31",
    }
    expect(buildReconciliationQuery(values)).toBe(
      "?branchId=branch-42&from=2026-05-01&to=2026-05-31"
    )
  })

  it("builds partial query when only dates are set", () => {
    expect(
      buildReconciliationQuery({ from: "2026-05-01", to: "2026-05-31" })
    ).toBe("?from=2026-05-01&to=2026-05-31")
  })
})
