import {
  buildConfirmedSaveUxResult,
  getUploadableProductCodesFromSaveItems,
} from "@/lib/catalog-image-ui/confirmed-save-ux"

const finalDir = "/data/catalog-images"

describe("getUploadableProductCodesFromSaveItems", () => {
  it("returns SAVED and DUPLICATE product codes", () => {
    const codes = getUploadableProductCodesFromSaveItems([
      { productCode: "0101015", status: "SAVED" },
      { productCode: "0101016", status: "DUPLICATE" },
      { productCode: "0101017", status: "ERROR" },
    ])

    expect(codes).toEqual(["0101015", "0101016"])
  })
})

describe("buildConfirmedSaveUxResult", () => {
  it("all DUPLICATE enables upload codes", () => {
    const result = buildConfirmedSaveUxResult({
      finalDir,
      items: [
        { productCode: "0101015", status: "DUPLICATE" },
        { productCode: "0101016", status: "DUPLICATE" },
      ],
    })

    expect(result.uploadableProductCodes).toEqual(["0101015", "0101016"])
    expect(result.saveMessage).toBe(
      "Local files already exist. Ready to upload. Duplicate local files: 2"
    )
    expect(result.errorMessage).toBeNull()
    expect(result.shouldResetPage).toBe(true)
  })

  it("all SAVED enables upload", () => {
    const result = buildConfirmedSaveUxResult({
      finalDir,
      items: [
        { productCode: "0101015", status: "SAVED" },
        { productCode: "0101016", status: "SAVED" },
      ],
    })

    expect(result.uploadableProductCodes).toEqual(["0101015", "0101016"])
    expect(result.saveMessage).toBe(`Saved 2 files to ${finalDir}`)
    expect(result.errorMessage).toBeNull()
    expect(result.shouldResetPage).toBe(true)
  })

  it("mixed saved and duplicate with no errors", () => {
    const result = buildConfirmedSaveUxResult({
      finalDir,
      items: [
        { productCode: "0101015", status: "SAVED" },
        { productCode: "0101016", status: "DUPLICATE" },
      ],
    })

    expect(result.uploadableProductCodes).toEqual(["0101015", "0101016"])
    expect(result.saveMessage).toBe(
      `Saved 1 file to ${finalDir}. Duplicate local files: 1`
    )
    expect(result.errorMessage).toBeNull()
    expect(result.shouldResetPage).toBe(true)
  })

  it("errors only yields no uploadable codes", () => {
    const result = buildConfirmedSaveUxResult({
      finalDir,
      items: [
        {
          productCode: "0101015",
          finalFileName: "0101015.png",
          status: "ERROR",
          error: "Product not found",
        },
      ],
    })

    expect(result.uploadableProductCodes).toEqual([])
    expect(result.saveMessage).toBeNull()
    expect(result.errorMessage).toBe(
      "No files were saved — 0101015.png: Product not found"
    )
    expect(result.shouldResetPage).toBe(false)
  })

  it("includes Local files already exist message for all duplicates", () => {
    const result = buildConfirmedSaveUxResult({
      finalDir,
      items: [{ productCode: "0101015", status: "DUPLICATE" }],
    })

    expect(result.saveMessage).toContain("Local files already exist. Ready to upload")
  })

  it("partial success with errors still enables upload for saved and duplicate", () => {
    const result = buildConfirmedSaveUxResult({
      finalDir,
      items: [
        { productCode: "0101015", status: "SAVED" },
        { productCode: "0101016", status: "DUPLICATE" },
        {
          productCode: "0101017",
          finalFileName: "0101017.png",
          status: "ERROR",
          error: "Product not found",
        },
      ],
    })

    expect(result.uploadableProductCodes).toEqual(["0101015", "0101016"])
    expect(result.saveMessage).toBe(
      `Saved 1 file to ${finalDir}. Duplicate local files: 1`
    )
    expect(result.errorMessage).toBe(
      "Some files were not saved — 0101017.png: Product not found"
    )
    expect(result.shouldResetPage).toBe(false)
  })
})
