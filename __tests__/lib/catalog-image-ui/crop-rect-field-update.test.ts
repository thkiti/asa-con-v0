import {
  applyCropRectFieldUpdate,
  getCropRectFieldBounds,
} from "@/lib/catalog-image-ui/crop-template"
import {
  adjustNumericStepperValue,
  formatNumericStepperValue,
} from "@/lib/catalog-image-ui/numeric-stepper"

const baseRect = {
  cropX: 0,
  cropY: 0,
  cropWidth: 500,
  cropHeight: 400,
}

describe("crop rect field updates", () => {
  it("keeps typed X at 116.0 when within image bounds", () => {
    const next = applyCropRectFieldUpdate(baseRect, "cropX", 116, 1000, 800)
    expect(next.cropX).toBe(116)
    expect(formatNumericStepperValue(next.cropX, "decimal")).toBe("116.0")
  })

  it("steps X up from 116.0 to 116.1", () => {
    const rect = { ...baseRect, cropX: 116 }
    const stepped = applyCropRectFieldUpdate(
      rect,
      "cropX",
      adjustNumericStepperValue(116, 0.1, "up", "decimal", 0, 500),
      1000,
      800
    )
    expect(stepped.cropX).toBe(116.1)
  })

  it("keeps typed Y at 45.0", () => {
    const next = applyCropRectFieldUpdate(baseRect, "cropY", 45, 1000, 800)
    expect(next.cropY).toBe(45)
    expect(formatNumericStepperValue(next.cropY, "decimal")).toBe("45.0")
  })

  it("preserves width and height field behavior", () => {
    const widthNext = applyCropRectFieldUpdate(baseRect, "cropWidth", 980, 1000, 800)
    expect(widthNext.cropWidth).toBe(980)

    const heightNext = applyCropRectFieldUpdate(
      baseRect,
      "cropHeight",
      1260,
      2000,
      2000
    )
    expect(heightNext.cropHeight).toBe(1260)
  })

  it("exposes image-aware bounds for each crop field", () => {
    const rect = { cropX: 116, cropY: 45, cropWidth: 500, cropHeight: 400 }
    expect(getCropRectFieldBounds(rect, 1000, 800)).toEqual({
      cropX: { min: 0, max: 500 },
      cropY: { min: 0, max: 400 },
      cropWidth: { min: 1, max: 884 },
      cropHeight: { min: 1, max: 755 },
    })
  })
})

describe("degree numeric stepper", () => {
  it("steps degree up from 180.0 to 180.1", () => {
    expect(adjustNumericStepperValue(180, 0.1, "up", "decimal")).toBe(180.1)
    expect(formatNumericStepperValue(180.1, "decimal")).toBe("180.1")
  })
})
