import { catalogImagePagePreviewUrl } from "@/lib/catalog-image-ui/fetchers"

describe("catalogImagePagePreviewUrl", () => {
  it("includes pageNo defaulting to 1", () => {
    expect(
      catalogImagePagePreviewUrl({
        fileName: "catalog.pdf",
        rotateDeg: 180,
      })
    ).toBe(
      "/api/operation/catalog-image/page-preview?fileName=catalog.pdf&rotateDeg=180&pageNo=1"
    )
  })

  it("includes selected pageNo", () => {
    expect(
      catalogImagePagePreviewUrl({
        fileName: "catalog.pdf",
        rotateDeg: 180,
        pageNo: 5,
        refreshKey: 2,
      })
    ).toBe(
      "/api/operation/catalog-image/page-preview?fileName=catalog.pdf&rotateDeg=180&pageNo=5&v=2"
    )
  })
})
