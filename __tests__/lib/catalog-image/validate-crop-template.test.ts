import { CatalogImageError } from "@/lib/catalog-image/errors"
import { parseCropAreaInput } from "@/lib/catalog-image/validate-crop-template"

describe("parseCropAreaInput", () => {
  it("returns null when crop fields are omitted", () => {
    expect(parseCropAreaInput({})).toBeNull()
  })

  it("parses valid crop area", () => {
    expect(
      parseCropAreaInput({
        cropX: 120,
        cropY: 40,
        cropWidth: 980,
        cropHeight: 1260,
      })
    ).toEqual({
      cropX: 120,
      cropY: 40,
      cropWidth: 980,
      cropHeight: 1260,
    })
  })

  it("rejects partial crop fields", () => {
    expect(() =>
      parseCropAreaInput({
        cropX: 10,
        cropY: 20,
      })
    ).toThrow(CatalogImageError)

    try {
      parseCropAreaInput({ cropX: 10, cropY: 20 })
    } catch (err) {
      expect(err).toMatchObject({ code: "INVALID_CROP_TEMPLATE" })
    }
  })

  it("rejects non-positive width or height", () => {
    expect(() =>
      parseCropAreaInput({
        cropX: 0,
        cropY: 0,
        cropWidth: 0,
        cropHeight: 100,
      })
    ).toThrow(CatalogImageError)
  })

  it("rejects negative position", () => {
    expect(() =>
      parseCropAreaInput({
        cropX: -1,
        cropY: 0,
        cropWidth: 100,
        cropHeight: 100,
      })
    ).toThrow(CatalogImageError)
  })
})
