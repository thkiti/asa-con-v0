import {
  applyShopSelection,
  filterShopOptionsForDocument,
  getSelectedShopIdFromLocations,
  getStockDocumentShopSelectionPolicy,
} from "@/lib/stock/document-read/stock-document-shop-selection"

const HO = { id: "ho-1", code: "HO999", name: "Head Office", type: "HO" as const }
const SH1 = { id: "sh-1", code: "SH001", name: "Chidlom", type: "SH" as const }
const SH2 = { id: "sh-2", code: "SH002", name: "Siam", type: "SH" as const }

describe("stock-document-shop-selection policy", () => {
  it("ASAD CNT/END: HO-only options; Shop maps to At (branch+from)", () => {
    expect(getStockDocumentShopSelectionPolicy("AD", "ADJUSTMENT")).toMatchObject({
      optionScope: "ho_only",
      mapsTo: "at_branch_and_from",
      meaning: "at",
    })
    expect(getStockDocumentShopSelectionPolicy("AD", "END")).toMatchObject({
      optionScope: "ho_only",
      mapsTo: "at_branch",
      meaning: "at",
    })

    const cntOptions = filterShopOptionsForDocument("AD", "ADJUSTMENT", [SH1, SH2], HO)
    expect(cntOptions).toEqual([HO])

    expect(
      applyShopSelection(HO.id, {
        legalEntityCode: "AD",
        docType: "ADJUSTMENT",
        hoBranchId: HO.id,
      })
    ).toEqual({
      branchId: HO.id,
      fromLocId: HO.id,
      toLocId: "",
    })
  })

  it("ASAD DEY: SH-only options; Shop maps to To; HO auto-resolved as from/branch", () => {
    expect(getStockDocumentShopSelectionPolicy("AD", "TRANSFER_OUT")).toMatchObject({
      optionScope: "sh_only",
      mapsTo: "to_destination",
      meaning: "to",
    })

    const deyOptions = filterShopOptionsForDocument(
      "AD",
      "TRANSFER_OUT",
      [SH1, SH2, HO],
      HO
    )
    expect(deyOptions.map((b) => b.id)).toEqual([SH1.id, SH2.id])

    expect(
      applyShopSelection(SH1.id, {
        legalEntityCode: "AD",
        docType: "TRANSFER_OUT",
        hoBranchId: HO.id,
      })
    ).toEqual({
      branchId: HO.id,
      fromLocId: HO.id,
      toLocId: SH1.id,
    })

    expect(
      getSelectedShopIdFromLocations("AD", "TRANSFER_OUT", {
        branchId: HO.id,
        fromLocId: HO.id,
        toLocId: SH2.id,
      })
    ).toBe(SH2.id)
  })

  it("ASAS documents: SH-only options; excludes HO", () => {
    for (const docType of ["ADJUSTMENT", "PERFORMANCE", "TRANSFER_OUT", "END"] as const) {
      const options = filterShopOptionsForDocument("AS", docType, [SH1, SH2, HO], HO)
      expect(options.map((b) => b.code)).toEqual(["SH001", "SH002"])
    }

    expect(
      applyShopSelection(SH1.id, {
        legalEntityCode: "AS",
        docType: "ADJUSTMENT",
        hoBranchId: HO.id,
      })
    ).toEqual({
      branchId: SH1.id,
      fromLocId: SH1.id,
      toLocId: "",
    })

    expect(
      applyShopSelection(SH1.id, {
        legalEntityCode: "AS",
        docType: "TRANSFER_OUT",
        hoBranchId: HO.id,
      })
    ).toEqual({
      branchId: SH1.id,
      fromLocId: SH1.id,
      toLocId: HO.id,
    })
  })

  it("reopens CNT with At shop from branchId", () => {
    expect(
      getSelectedShopIdFromLocations("AD", "ADJUSTMENT", {
        branchId: HO.id,
        fromLocId: HO.id,
        toLocId: "",
      })
    ).toBe(HO.id)

    expect(
      getSelectedShopIdFromLocations("AS", "PERFORMANCE", {
        branchId: SH1.id,
        fromLocId: SH1.id,
        toLocId: "",
      })
    ).toBe(SH1.id)
  })
})
