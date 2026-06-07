import {
  adjustCropSize,
  buildCropTemplate,
  clampCropRect,
  defaultCropRect,
  moveCropRect,
  nudgeCropRect,
  resizeCropRect,
} from "@/lib/catalog-image-ui/crop-template"

describe("crop-template helpers", () => {
  it("defaultCropRect covers full image", () => {
    expect(defaultCropRect(1000, 800)).toEqual({
      cropX: 0,
      cropY: 0,
      cropWidth: 1000,
      cropHeight: 800,
    })
  })

  it("clampCropRect preserves one decimal place", () => {
    expect(
      clampCropRect(
        { cropX: 1000.04, cropY: 45.06, cropWidth: 980.44, cropHeight: 1260.55 },
        2000,
        2000
      )
    ).toEqual({
      cropX: 1000.0,
      cropY: 45.1,
      cropWidth: 980.4,
      cropHeight: 1260.6,
    })
  })

  it("clampCropRect keeps rect inside image bounds", () => {
    expect(
      clampCropRect(
        { cropX: 900, cropY: 700, cropWidth: 200, cropHeight: 200 },
        1000,
        800
      )
    ).toEqual({
      cropX: 800,
      cropY: 600,
      cropWidth: 200,
      cropHeight: 200,
    })
  })

  it("moveCropRect shifts position", () => {
    const moved = moveCropRect(
      { cropX: 10, cropY: 20, cropWidth: 200, cropHeight: 100 },
      5,
      10,
      1000,
      800
    )
    expect(moved.cropX).toBe(15)
    expect(moved.cropY).toBe(30)
  })

  it("resizeCropRect updates size from southeast handle", () => {
    const resized = resizeCropRect(
      { cropX: 0, cropY: 0, cropWidth: 200, cropHeight: 100 },
      "se",
      20,
      30,
      1000,
      800
    )
    expect(resized).toEqual({
      cropX: 0,
      cropY: 0,
      cropWidth: 220,
      cropHeight: 130,
    })
  })

  it("nudgeCropRect moves by direction and amount", () => {
    const rect = { cropX: 10, cropY: 20, cropWidth: 200, cropHeight: 100 }
    expect(nudgeCropRect(rect, "right", 5, 1000, 800).cropX).toBe(15)
    expect(nudgeCropRect(rect, "down", 3, 1000, 800).cropY).toBe(23)
  })

  it("adjustCropSize changes width and height", () => {
    expect(
      adjustCropSize(
        { cropX: 0, cropY: 0, cropWidth: 200, cropHeight: 100 },
        10,
        5,
        1000,
        800
      )
    ).toEqual({
      cropX: 0,
      cropY: 0,
      cropWidth: 210,
      cropHeight: 105,
    })
  })

  it("buildCropTemplate merges settings and rect", () => {
    expect(
      buildCropTemplate({ rotateDeg: 180, columns: 3, rows: 2 }, 1000, 800)
    ).toEqual({
      rotateDeg: 180,
      columns: 3,
      rows: 2,
      cropX: 0,
      cropY: 0,
      cropWidth: 1000,
      cropHeight: 800,
    })
  })
})
