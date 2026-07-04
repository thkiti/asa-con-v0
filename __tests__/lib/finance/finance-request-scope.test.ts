import {
  assertFinanceLegalEntityAllowed,
  readFinanceRequestLegalEntityCode,
  resolveFinanceRequestLegalEntityCode,
} from "@/lib/finance/finance-request-scope"
import { DocumentEntityError } from "@/lib/legal-entity"

const hoFinanceAs = {
  role: "HO_FINANCE" as const,
  branchCode: "HO999",
  documentEntityCode: "AS" as const,
  sessionId: "s1",
  userId: "u1",
  staffId: "staff-1",
  name: "Finance",
  branchId: "b1",
  branchName: "HO",
}

describe("finance request legal entity scope", () => {
  it("reads entity from query param", () => {
    const params = new URLSearchParams({ legalEntityCode: "AD" })
    expect(readFinanceRequestLegalEntityCode({ searchParams: params })).toBe("AD")
  })

  it("prefers explicit request entity over session cookie", () => {
    const session = { ...hoFinanceAs, documentEntityCode: "AD" as const }
    expect(resolveFinanceRequestLegalEntityCode(session, "AS")).toBe("AS")
  })

  it("falls back to session entity when request omits scope", () => {
    expect(resolveFinanceRequestLegalEntityCode(hoFinanceAs, null)).toBe("AS")
  })

  it("rejects AD for shop branches", () => {
    expect(() =>
      assertFinanceLegalEntityAllowed(
        { role: "SH_STAFF", branchCode: "SH001" },
        "AD"
      )
    ).toThrow(DocumentEntityError)
  })

  it("allows HO finance to use AD from request even when session is AS", () => {
    const session = { ...hoFinanceAs, documentEntityCode: "AS" as const }
    expect(resolveFinanceRequestLegalEntityCode(session, "AD")).toBe("AD")
  })
})
