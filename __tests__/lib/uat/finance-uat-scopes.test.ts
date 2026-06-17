import {
  FINANCE_UAT_MANUAL_REF_TYPES,
  FINANCE_UAT_OPERATIONAL_REF_TYPES,
  refTypesForScope,
} from "@/lib/uat/finance-uat-scopes"

describe("finance UAT scopes", () => {
  it("manual-only targets workflow ref types only", () => {
    const types = refTypesForScope("manual-only")
    expect(types).toContain("OPENING_BALANCE_JOURNAL")
    expect(types).toContain("MANUAL_JOURNAL")
    for (const op of FINANCE_UAT_OPERATIONAL_REF_TYPES) {
      expect(types).not.toContain(op)
    }
  })

  it("all-gl includes operational ref types", () => {
    const types = refTypesForScope("all-gl")
    for (const op of FINANCE_UAT_OPERATIONAL_REF_TYPES) {
      expect(types).toContain(op)
    }
    expect(types.length).toBeGreaterThan(FINANCE_UAT_MANUAL_REF_TYPES.length)
  })
})
