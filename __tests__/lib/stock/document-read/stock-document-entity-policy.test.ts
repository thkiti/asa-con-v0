import {
  allowsAllShopsFilter,
  assertEntityBranchCombination,
  filterBranchesForEntityScope,
  getAllowedDocTypesForEntity,
  getStockDocumentLocationFilterLabel,
  getStockDocumentLocationMode,
  getStockDocumentTypesForEntity,
  isStockDocumentKindAllowedForEntity,
  isStockDocumentTypeAllowedForEntity,
  normalizeFiltersForEntity,
  requiresSpecificShopForEnd,
  resolveEndBranchCodeForEntity,
} from "@/lib/stock/document-read/stock-document-entity-policy"
import { HO_BRANCH_CODE } from "@/lib/legal-entity/constants"

const branches = [
  { id: "ho", code: HO_BRANCH_CODE, name: "Head Office", type: "HO" as const },
  { id: "sh1", code: "SH001", name: "Chidlom", type: "SH" as const },
  { id: "sh2", code: "SH002", name: "Siam", type: "SH" as const },
]

describe("stock-document-entity-policy", () => {
  it("ASAD filter policy returns only HO999", () => {
    const scoped = filterBranchesForEntityScope("AD", branches, branches[0])
    expect(scoped).toEqual([branches[0]])
    expect(scoped.some((b) => b.code.startsWith("SH"))).toBe(false)
    expect(allowsAllShopsFilter("AD")).toBe(false)
    expect(getStockDocumentLocationMode("AD")).toBe("ho_location")
    expect(getStockDocumentLocationFilterLabel("AD")).toBe("Location")
  })

  it("ASAD document types are only CNT, DEY, END", () => {
    const kinds = getStockDocumentTypesForEntity("AD").map((k) => k.value)
    expect(kinds).toEqual(["", "CNT", "DEY", "END"])
    expect(getAllowedDocTypesForEntity("AD")).toEqual([
      "ADJUSTMENT",
      "TRANSFER_OUT",
      "END",
    ])
    expect(isStockDocumentKindAllowedForEntity("AD", "ORD")).toBe(false)
    expect(isStockDocumentTypeAllowedForEntity("AD", "PERFORMANCE")).toBe(false)
  })

  it("ASAD does not show All Shops or SHxxx", () => {
    const scoped = filterBranchesForEntityScope("AD", branches)
    expect(scoped).toHaveLength(1)
    expect(scoped[0]?.code).toBe(HO_BRANCH_CODE)
  })

  it("ASAS shows eligible SHxxx Shops and All Shops", () => {
    const scoped = filterBranchesForEntityScope("AS", branches)
    expect(allowsAllShopsFilter("AS")).toBe(true)
    expect(getStockDocumentLocationFilterLabel("AS")).toBe("Shop")
    expect(scoped.map((b) => b.code)).toEqual(["SH001", "SH002"])
  })

  it("ASAS does not show HO999", () => {
    const scoped = filterBranchesForEntityScope("AS", branches)
    expect(scoped.some((b) => b.code === HO_BRANCH_CODE)).toBe(false)
  })

  it("ASAS document types exclude ASAD-only DEY kind", () => {
    const kinds = getStockDocumentTypesForEntity("AS").map((k) => k.value)
    expect(kinds).toContain("ORD")
    expect(kinds).toContain("CNT")
    expect(kinds).toContain("END")
    expect(kinds).not.toContain("DEY")
  })

  it("entity switch clears stale branch and type filters", () => {
    const asNormalized = normalizeFiltersForEntity(
      "AS",
      { shopBranchId: "ho", docKind: "DEY" },
      { hoBranchId: "ho", shopOptionIds: new Set(["sh1", "sh2"]) }
    )
    expect(asNormalized.shopBranchId).toBe("")
    expect(asNormalized.docKind).toBe("")
    expect(asNormalized.changed).toBe(true)

    const adNormalized = normalizeFiltersForEntity(
      "AD",
      { shopBranchId: "sh1", docKind: "ORD" },
      { hoBranchId: "ho", shopOptionIds: new Set(["sh1"]) }
    )
    expect(adNormalized.shopBranchId).toBe("ho")
    expect(adNormalized.docKind).toBe("")
  })

  it("END branch rules", () => {
    expect(resolveEndBranchCodeForEntity("AD")).toBe(HO_BRANCH_CODE)
    expect(resolveEndBranchCodeForEntity("AS")).toBeNull()
    expect(requiresSpecificShopForEnd("AS")).toBe(true)
    expect(requiresSpecificShopForEnd("AD")).toBe(false)
  })

  it("rejects invalid entity + branch combinations", () => {
    expect(() =>
      assertEntityBranchCombination({
        legalEntityCode: "AD",
        branchCode: "SH001",
        branchType: "SH",
      })
    ).toThrow(/HO999/)

    expect(() =>
      assertEntityBranchCombination({
        legalEntityCode: "AS",
        branchCode: HO_BRANCH_CODE,
        branchType: "HO",
      })
    ).toThrow(/HO999/)
  })
})
