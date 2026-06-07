import { normalizeCatalogProductCode } from "@/lib/catalog-image/normalize-catalog-code"
import {
  buildFinalFileName,
  getSlotSourceFileName,
} from "@/lib/catalog-image-ui/slot-file-names"

describe("slot file names", () => {
  it("derives sourceFile from local crop path", () => {
    expect(
      getSlotSourceFileName(
        "local/catalog-image/work/batch-1/page-1/slot-1.png"
      )
    ).toBe("slot-1.png")
  })

  it("maps rawCode 1010152 to finalFileName 0101015.png", () => {
    const productCode = normalizeCatalogProductCode("1010152")
    expect(productCode).toBe("0101015")
    expect(buildFinalFileName(productCode)).toBe("0101015.png")
  })

  it("returns null finalFileName when productCode is missing", () => {
    expect(buildFinalFileName(null)).toBeNull()
  })
})
