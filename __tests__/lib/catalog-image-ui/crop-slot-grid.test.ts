import { computeSlotRects, resolveCropArea } from "@/lib/catalog-image-ui/crop-slot-grid"

describe("resolveCropArea", () => {
  it("defaults to full page when crop area is omitted", () => {
    expect(resolveCropArea(null, 1200, 800)).toEqual({
      cropX: 0,
      cropY: 0,
      cropWidth: 1200,
      cropHeight: 800,
    })
  })

  it("validates crop bounds", () => {
    expect(() =>
      resolveCropArea(
        { cropX: 10, cropY: 10, cropWidth: 500, cropHeight: 900 },
        400,
        400
      )
    ).toThrow("crop area is outside page bounds")
  })
})

describe("computeSlotRects", () => {
  it("builds a 3x2 grid with edge slots absorbing remainder", () => {
    const rects = computeSlotRects(1007, 1472, 3, 2)
    expect(rects).toHaveLength(6)
    expect(rects[0]).toEqual({ left: 0, top: 0, width: 335, height: 736 })
    expect(rects[2]).toEqual({ left: 670, top: 0, width: 337, height: 736 })
    expect(rects[5]).toEqual({ left: 670, top: 736, width: 337, height: 736 })
  })
})
