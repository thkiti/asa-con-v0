import {
  parseBranchListQuery,
  parseProductReferenceListQuery,
  parseStaffListQuery,
} from "@/lib/master/parse-queries"

describe("parseBranchListQuery", () => {
  it("defaults mode to active", () => {
    expect(parseBranchListQuery(new URLSearchParams())).toEqual({
      mode: "active",
      code: "",
      name: "",
      type: "",
      activeOnly: false,
    })
  })

  it("parses trash mode and filters", () => {
    expect(
      parseBranchListQuery(
        new URLSearchParams("mode=trash&code=sh&name=shop&type=SH&activeOnly=1")
      )
    ).toEqual({
      mode: "trash",
      code: "sh",
      name: "shop",
      type: "SH",
      activeOnly: true,
    })
  })
})

describe("parseStaffListQuery", () => {
  it("parses role and branchCode when valid", () => {
    expect(
      parseStaffListQuery(
        new URLSearchParams(
          "mode=active&role=HO_ADMIN&branchCode=HO999&staffId=001&name=admin"
        )
      )
    ).toEqual({
      mode: "active",
      staffId: "001",
      name: "admin",
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
