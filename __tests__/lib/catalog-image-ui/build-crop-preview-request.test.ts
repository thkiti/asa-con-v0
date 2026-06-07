import { buildCropPreviewRequestBody } from "@/lib/catalog-image-ui/fetchers"

describe("buildCropPreviewRequestBody", () => {
  it("includes crop template fields when provided", () => {
    expect(
      buildCropPreviewRequestBody(
        {
          fileName: "catalog.pdf",
          rotateDeg: 180,
          columns: 3,
          rows: 2,
        },
        {
          rotateDeg: 180,
          columns: 3,
          rows: 2,
          cropX: 10,
          cropY: 20,
          cropWidth: 300,
          cropHeight: 400,
        }
      )
    ).toEqual({
      fileName: "catalog.pdf",
      rotateDeg: 180,
      columns: 3,
      rows: 2,
      cropX: 10,
      cropY: 20,
      cropWidth: 300,
      cropHeight: 400,
    })
  })

  it("preserves pageNo in request body", () => {
    expect(
      buildCropPreviewRequestBody({
        fileName: "catalog.pdf",
        rotateDeg: 180,
        columns: 3,
        rows: 2,
        pageNo: 2,
      })
    ).toEqual({
      fileName: "catalog.pdf",
      rotateDeg: 180,
      columns: 3,
      rows: 2,
      pageNo: 2,
    })
  })

  it("omits crop fields when template is null", () => {
    expect(
      buildCropPreviewRequestBody({
        fileName: "catalog.pdf",
        rotateDeg: 180,
        columns: 3,
        rows: 2,
      }, null)
    ).toEqual({
      fileName: "catalog.pdf",
      rotateDeg: 180,
      columns: 3,
      rows: 2,
    })
  })
})
