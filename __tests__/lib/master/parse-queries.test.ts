import {
  parseBranchListQuery,
  parseProductReferenceListQuery,
  parseStaffListQuery,
} from "@/lib/master/parse-queries"

describe("parseBranchListQuery", () => {
  it("defaults mode to active", () => {
    expect(parseBranchListQuery(new URLSearchParams())).toEqual({
      mode: "active",
      q: "",
    })
  })

  it("parses trash mode and search", () => {
    expect(
      parseBranchListQuery(new URLSearchParams("mode=trash&q=sh"))
    ).toEqual({ mode: "trash", q: "sh" })
  })
})

describe("parseStaffListQuery", () => {
  it("parses role and branchCode when valid", () => {
    expect(
      parseStaffListQuery(
        new URLSearchParams("mode=active&role=HO_ADMIN&branchCode=HO999&q=001")
      )
    ).toEqual({
      mode: "active",
      q: "001",
      role: "HO_ADMIN",
      branchCode: "HO999",
    })
  })

  it("ignores invalid role", () => {
    expect(parseStaffListQuery(new URLSearchParams("role=INVALID"))).toMatchObject({
      role: null,
    })
  })
})

describe("parseProductReferenceListQuery", () => {
  it("parses reference status filter", () => {
    expect(
      parseProductReferenceListQuery(new URLSearchParams("referenceStatus=has"))
    ).toMatchObject({ referenceStatus: "has" })
    expect(
      parseProductReferenceListQuery(new URLSearchParams("referenceStatus=none"))
    ).toMatchObject({ referenceStatus: "none" })
    expect(
      parseProductReferenceListQuery(new URLSearchParams("referenceStatus=unknown"))
    ).toMatchObject({ referenceStatus: "all" })
  })
})
