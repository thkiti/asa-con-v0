import {
  DEFAULT_CATALOG_CROP_POSITION,
  defaultCatalogCropRect,
} from "@/lib/catalog-image-ui/crop-template"

describe("defaultCatalogCropRect", () => {
  it("applies catalog default crop position when image is large enough", () => {
    expect(defaultCatalogCropRect(2000, 2000)).toEqual(
      DEFAULT_CATALOG_CROP_POSITION
    )
  })

  it("clamps default crop position inside smaller images", () => {
    const rect = defaultCatalogCropRect(800, 600)
    expect(rect.cropX).toBeGreaterThanOrEqual(0)
    expect(rect.cropY).toBeGreaterThanOrEqual(0)
    expect(rect.cropX + rect.cropWidth).toBeLessThanOrEqual(800)
    expect(rect.cropY + rect.cropHeight).toBeLessThanOrEqual(600)
  })
})
