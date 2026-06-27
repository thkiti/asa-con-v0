import { resolveFinanceSessionLegalEntityCode } from "@/lib/finance/finance-session"

describe("resolveFinanceSessionLegalEntityCode", () => {
  it("returns session documentEntityCode when present", () => {
    expect(resolveFinanceSessionLegalEntityCode({ documentEntityCode: "AD" })).toBe("AD")
  })

  it("throws UNAUTHORIZED when session entity is missing", () => {
    expect(() => resolveFinanceSessionLegalEntityCode(null)).toThrow("Session legal entity is required")
    expect(() => resolveFinanceSessionLegalEntityCode({})).toThrow("Session legal entity is required")
  })
})
