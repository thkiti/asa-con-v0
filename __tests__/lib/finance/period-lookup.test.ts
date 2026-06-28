import {
  accountingPeriodUniqueWhere,
  resolvePeriodLegalEntityCode,
} from "@/lib/finance/period-lookup"

describe("period lookup", () => {
  it("builds entity-scoped period unique where", () => {
    expect(
      accountingPeriodUniqueWhere({ periodKey: "2026-05", legalEntityCode: "AD" })
    ).toEqual({
      legalEntityCode_periodKey: {
        legalEntityCode: "AD",
        periodKey: "2026-05",
      },
    })
  })

  it("resolvePeriodLegalEntityCode still defaults for bootstrap paths only", () => {
    expect(resolvePeriodLegalEntityCode(undefined)).toBe("AS")
    expect(resolvePeriodLegalEntityCode("AD")).toBe("AD")
  })
})
