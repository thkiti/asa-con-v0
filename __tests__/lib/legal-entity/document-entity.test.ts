import {
  assertDocumentEntityChangeAllowed,
  canChooseDocumentEntity,
  DocumentEntityError,
  resolveLoginDocumentEntityCode,
} from "@/lib/legal-entity"

describe("canChooseDocumentEntity", () => {
  it("allows HO999 HO_FINANCE and HO_ADMIN", () => {
    expect(canChooseDocumentEntity("HO_FINANCE", "HO999")).toBe(true)
    expect(canChooseDocumentEntity("HO_ADMIN", "HO999")).toBe(true)
  })

  it("denies shop branch and other roles", () => {
    expect(canChooseDocumentEntity("HO_FINANCE", "SH001")).toBe(false)
    expect(canChooseDocumentEntity("HO_ADMIN", "SH001")).toBe(false)
    expect(canChooseDocumentEntity("HO_OPERATIONS", "HO999")).toBe(false)
    expect(canChooseDocumentEntity("SH_STAFF", "SH001")).toBe(false)
  })
})

describe("resolveLoginDocumentEntityCode", () => {
  it("defaults to AS for shop login", () => {
    expect(
      resolveLoginDocumentEntityCode({
        role: "SH_STAFF",
        branchCode: "SH001",
      })
    ).toBe("AS")
  })

  it("defaults to AS for HO999 finance when not requested", () => {
    expect(
      resolveLoginDocumentEntityCode({
        role: "HO_FINANCE",
        branchCode: "HO999",
      })
    ).toBe("AS")
  })

  it("allows AD for HO999 HO_ADMIN when requested", () => {
    expect(
      resolveLoginDocumentEntityCode({
        role: "HO_ADMIN",
        branchCode: "HO999",
        requested: "AD",
      })
    ).toBe("AD")
  })

  it("rejects AD for shop login", () => {
    expect(() =>
      resolveLoginDocumentEntityCode({
        role: "HO_ADMIN",
        branchCode: "SH001",
        requested: "AD",
      })
    ).toThrow(DocumentEntityError)
  })
})

describe("assertDocumentEntityChangeAllowed", () => {
  it("accepts valid codes for HO999 finance", () => {
    expect(
      assertDocumentEntityChangeAllowed({
        role: "HO_FINANCE",
        branchCode: "HO999",
        requested: "AD",
      })
    ).toBe("AD")
  })

  it("rejects invalid code", () => {
    expect(() =>
      assertDocumentEntityChangeAllowed({
        role: "HO_FINANCE",
        branchCode: "HO999",
        requested: "XX",
      })
    ).toThrow(DocumentEntityError)
  })

  it("rejects change for shop session", () => {
    expect(() =>
      assertDocumentEntityChangeAllowed({
        role: "SH_STAFF",
        branchCode: "SH001",
        requested: "AD",
      })
    ).toThrow(DocumentEntityError)
  })
})
