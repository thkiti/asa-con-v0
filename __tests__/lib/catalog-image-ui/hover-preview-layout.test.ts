import {
  catalogHoverPreviewBounds,
  CATALOG_HOVER_PREVIEW_MAX_HEIGHT,
  CATALOG_HOVER_PREVIEW_MAX_WIDTH,
} from "@/lib/catalog-image-ui/hover-preview-layout"

describe("catalog hover preview layout", () => {
  it("uses viewport-relative CSS limits", () => {
    expect(CATALOG_HOVER_PREVIEW_MAX_WIDTH).toBe("min(320px, 28vw)")
    expect(CATALOG_HOVER_PREVIEW_MAX_HEIGHT).toBe("min(420px, 70vh)")
  })

  it("computes pixel bounds for positioning from viewport size", () => {
    expect(catalogHoverPreviewBounds(1920, 1080)).toEqual({
      maxWidth: 320,
      maxHeight: 420,
    })
    expect(catalogHoverPreviewBounds(800, 600)).toEqual({
      maxWidth: 224,
      maxHeight: 420,
    })
    expect(catalogHoverPreviewBounds(1200, 500)).toEqual({
      maxWidth: 320,
      maxHeight: 350,
    })
  })
})
