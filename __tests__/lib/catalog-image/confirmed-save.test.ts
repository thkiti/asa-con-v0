import { confirmedSaveCatalogImages } from "@/lib/catalog-image/confirmed-save"
import { cropCatalogPdf } from "@/lib/catalog-image/crop-pdf"
import { deleteCatalogImageBatch } from "@/lib/catalog-image/paths"
import { saveMatchedCatalogImages } from "@/lib/catalog-image/save-matched"

jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => "batch-test-1"),
}))

jest.mock("fs/promises", () => ({
  access: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/catalog-image/crop-pdf", () => ({
  cropCatalogPdf: jest.fn(),
}))

jest.mock("@/lib/catalog-image/save-matched", () => ({
  saveMatchedCatalogImages: jest.fn(),
}))

jest.mock("@/lib/catalog-image/config", () => {
  const actual = jest.requireActual<typeof import("@/lib/catalog-image/config")>(
    "@/lib/catalog-image/config"
  )
  return {
    ...actual,
    getCatalogImageFinalDir: jest.fn(() => "/tmp/catalog-images"),
  }
})

jest.mock("@/lib/catalog-image/paths", () => {
  const actual = jest.requireActual("@/lib/catalog-image/paths")
  return {
    ...actual,
    deleteCatalogImageBatch: jest.fn(),
  }
})

const mockedCrop = cropCatalogPdf as jest.MockedFunction<typeof cropCatalogPdf>
const mockedSave = saveMatchedCatalogImages as jest.MockedFunction<
  typeof saveMatchedCatalogImages
>
const mockedDelete = deleteCatalogImageBatch as jest.MockedFunction<
  typeof deleteCatalogImageBatch
>

const db = {
  product: {
    findUnique: jest.fn(),
  },
}

describe("confirmedSaveCatalogImages", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedCrop.mockResolvedValue({
      batchId: "batch-test-1",
      pages: [
        {
          pageNo: 1,
          slots: [
            {
              sourcePage: 1,
              sourceSlot: 1,
              localFilePath: "D:/work/batch-test-1/page-1/slot-1.png",
              previewPath: "D:/work/batch-test-1/page-1/slot-1.png",
            },
            {
              sourcePage: 1,
              sourceSlot: 2,
              localFilePath: "D:/work/batch-test-1/page-1/slot-2.png",
              previewPath: "D:/work/batch-test-1/page-1/slot-2.png",
            },
          ],
        },
      ],
    })
    mockedSave.mockResolvedValue([
      {
        productCode: "0101015",
        finalFilePath: "D:/work/final/0101015.png",
        finalFileName: "0101015.png",
        status: "SAVED",
      },
      {
        productCode: "0101016",
        finalFilePath: "D:/work/final/0101016.png",
        finalFileName: "0101016.png",
        status: "DUPLICATE",
      },
    ])
    mockedDelete.mockResolvedValue(undefined)
  })

  it("crops, saves assigned slots, and deletes temp batch", async () => {
    const result = await confirmedSaveCatalogImages(db, {
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
    })

    expect(mockedCrop).toHaveBeenCalledWith(
      expect.objectContaining({
        batchId: "batch-test-1",
        pageNo: 1,
      })
    )
    expect(mockedSave).toHaveBeenCalledWith(db, [
      expect.objectContaining({
        productCode: "0101015",
        localFilePath: "D:/work/batch-test-1/page-1/slot-1.png",
      }),
      expect.objectContaining({
        productCode: "0101016",
        localFilePath: "D:/work/batch-test-1/page-1/slot-2.png",
      }),
    ])
    expect(mockedDelete).toHaveBeenCalledWith("batch-test-1")
    expect(result.finalDir).toBe("/tmp/catalog-images")
    expect(result.savedCount).toBe(1)
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceSlot: 1,
          status: "SAVED",
          finalFileName: "0101015.png",
        }),
        expect.objectContaining({
          sourceSlot: 2,
          status: "DUPLICATE",
          finalFileName: "0101016.png",
        }),
      ])
    )
  })
})
