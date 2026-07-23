import {
  buildEntityScopedListWhere,
  resolveListAllowedDocTypes,
} from "@/lib/stock/document-read/stock-document-entity-scope"
import { DocumentError } from "@/lib/stock/document/document-errors"

describe("buildEntityScopedListWhere", () => {
  const hoId = "branch-ho"
  const shopId = "branch-sh001"

  it("ASAD list cannot include ASAS shop-owned ORD scope", () => {
    const where = buildEntityScopedListWhere({
      legalEntityCode: "AD",
      hoBranchId: hoId,
      branchId: hoId,
      allowedDocTypes: ["ADJUSTMENT", "TRANSFER_OUT", "END"],
    })

    const json = JSON.stringify(where)
    expect(json).toContain(hoId)
    expect(json).not.toContain(shopId)
    // DEY = TRANSFER_OUT from HO
    expect(json).toContain("TRANSFER_OUT")
    expect(json).toContain("fromLocId")
  })

  it("ASAS list excludes HO999 / DEY from HO", () => {
    const where = buildEntityScopedListWhere({
      legalEntityCode: "AS",
      hoBranchId: hoId,
      branchId: shopId,
      allowedDocTypes: ["TRANSFER_OUT", "ADJUSTMENT", "PERFORMANCE", "END"],
    })
    const json = JSON.stringify(where)
    expect(json).toContain(shopId)
    expect(json).toContain(`"NOT":{"fromLocId":"${hoId}"}`)
  })

  it("ASAS All Shops excludes HO-owned documents", () => {
    const where = buildEntityScopedListWhere({
      legalEntityCode: "AS",
      hoBranchId: hoId,
      branchId: null,
      allowedDocTypes: ["TRANSFER_OUT", "ADJUSTMENT", "PERFORMANCE", "END"],
    })
    const json = JSON.stringify(where)
    expect(json).toContain(`"NOT":{"fromLocId":"${hoId}"}`)
    expect(json).toContain('"legalEntityCode":"AS"')
  })

  it("ASAD END scopes to AD + HO only", () => {
    const where = buildEntityScopedListWhere({
      legalEntityCode: "AD",
      hoBranchId: hoId,
      branchId: hoId,
      docType: "END",
      allowedDocTypes: ["END"],
    })
    expect(where).toEqual({
      AND: [
        { docType: "END" },
        { legalEntityCode: "AD", branchId: hoId },
      ],
    })
  })
})

describe("resolveListAllowedDocTypes", () => {
  it("rejects ASAD + ORD (PERFORMANCE not in ASAD; TRANSFER_OUT allowed but ORD is UI)", () => {
    expect(() =>
      resolveListAllowedDocTypes("AD", undefined, "PERFORMANCE")
    ).toThrow(DocumentError)
  })

  it("allows ASAS END", () => {
    expect(resolveListAllowedDocTypes("AS", undefined, "END")).toEqual(["END"])
  })
})
