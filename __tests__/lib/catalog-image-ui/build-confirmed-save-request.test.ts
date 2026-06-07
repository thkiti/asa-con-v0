import { buildConfirmedSaveRequestBody } from "@/lib/catalog-image-ui/fetchers"

describe("buildConfirmedSaveRequestBody", () => {
  it("includes crop template and assigned slots", () => {
    const body = buildConfirmedSaveRequestBody(
      {
        fileName: "catalog.pdf",
        pageNo: 1,
        rotateDeg: 180,
        columns: 3,
        rows: 2,
      },
      {
        rotateDeg: 180,
        columns: 3,
        rows: 2,
        cropX: 116,
        cropY: 97,
        cropWidth: 1007,
        cropHeight: 1472,
      },
      [
        { sourceSlot: 1, productCode: "0101015" },
        { sourceSlot: 2, productCode: "0101016" },
      ]
    )

    expect(body).toEqual({
      fileName: "catalog.pdf",
      pageNo: 1,
      rotateDeg: 180,
      columns: 3,
      rows: 2,
      cropX: 116,
      cropY: 97,
      cropWidth: 1007,
      cropHeight: 1472,
      assignedSlots: [
        { sourceSlot: 1, productCode: "0101015" },
        { sourceSlot: 2, productCode: "0101016" },
      ],
      replace: undefined,
    })
  })

  it("passes replace option when provided", () => {
    const body = buildConfirmedSaveRequestBody(
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
        cropX: 116,
        cropY: 97,
        cropWidth: 1007,
        cropHeight: 1472,
      },
      [{ sourceSlot: 1, productCode: "0101015" }],
      { replace: false }
    )

    expect(body.replace).toBe(false)
  })

  it("passes replace=true when overwrite is requested", () => {
    const body = buildConfirmedSaveRequestBody(
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
        cropX: 116,
        cropY: 97,
        cropWidth: 1007,
        cropHeight: 1472,
      },
      [{ sourceSlot: 1, productCode: "0101015" }],
      { replace: true }
    )

    expect(body.replace).toBe(true)
  })
})
