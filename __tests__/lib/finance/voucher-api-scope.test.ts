import { applyFinanceVoucherListScope } from "@/app/api/finance/shared/voucher-api-scope"

describe("applyFinanceVoucherListScope", () => {
  it("overrides client legalEntityCode query with resolved request entity", () => {
    const scoped = applyFinanceVoucherListScope(
      { legalEntityCode: "AD" as const, status: "POSTED" },
      "AS"
    )

    expect(scoped.legalEntityCode).toBe("AS")
    expect(scoped.status).toBe("POSTED")
  })
})
