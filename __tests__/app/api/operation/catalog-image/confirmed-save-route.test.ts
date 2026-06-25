import { POST } from "@/app/api/operation/catalog-image/confirmed-save/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/catalog-image/confirmed-save", () => ({
  confirmedSaveCatalogImages: jest.fn(),
  confirmedSaveCatalogImagesFromBlobs: jest.fn(),
}))

import { getSession } from "@/lib/auth/session"
import {
  confirmedSaveCatalogImages,
  confirmedSaveCatalogImagesFromBlobs,
} from "@/lib/catalog-image/confirmed-save"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedConfirmedSave = confirmedSaveCatalogImages as jest.MockedFunction<
  typeof confirmedSaveCatalogImages
>
const mockedConfirmedSaveBlobs =
  confirmedSaveCatalogImagesFromBlobs as jest.MockedFunction<
    typeof confirmedSaveCatalogImagesFromBlobs
  >

const hoSession = {
  sessionId: "s1",
  userId: "u1",
  role: "HO_OPERATIONS" as const,
  staffId: "staff-1",
  name: "Ops",
  branchId: "branch-1",
  branchCode: "HO",
  branchName: "Head Office",
}

describe("POST /api/operation/catalog-image/confirmed-save", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(hoSession)
    mockedConfirmedSave.mockResolvedValue({
      batchId: "batch-test-1",
      finalDir: "D:/work/final",
      savedCount: 2,
      items: [
        {
          sourceSlot: 1,
          productCode: "0101015",
          finalFileName: "0101015.png",
          status: "SAVED",
        },
      ],
    })
    mockedConfirmedSaveBlobs.mockResolvedValue({
      batchId: "batch-blob-1",
      finalDir: "D:/work/final",
      savedCount: 1,
      items: [
        {
          sourceSlot: 1,
          productCode: "0101015",
          finalFileName: "0101015.png",
          status: "SAVED",
        },
      ],
    })
  })

  it("delegates multipart blob save to confirmedSaveCatalogImagesFromBlobs", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const formData = new FormData()
    formData.append(
      "meta",
      JSON.stringify({
        assignedSlots: [{ sourceSlot: 1, productCode: "0101015" }],
      })
    )
    formData.append(
      "slot-1",
      new File([pngBytes], "0101015.png", { type: "image/png" })
    )

    const res = await POST(
      new Request("http://localhost/api/operation/catalog-image/confirmed-save", {
        method: "POST",
        body: formData,
      })
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        savedCount: 1,
        batchId: "batch-blob-1",
      })
    )
    expect(mockedConfirmedSaveBlobs).toHaveBeenCalled()
    expect(mockedConfirmedSave).not.toHaveBeenCalled()
  })

  it("delegates JSON save to confirmedSaveCatalogImages", async () => {
    const res = await POST(
      new Request("http://localhost/api/operation/catalog-image/confirmed-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "catalog.pdf",
          pageNo: 1,
          rotateDeg: 180,
          columns: 3,
          rows: 2,
          cropX: 116,
          cropY: 97,
          cropWidth: 1007,
          cropHeight: 1472,
          assignedSlots: [{ sourceSlot: 1, productCode: "0101015" }],
        }),
      })
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        savedCount: 2,
        batchId: "batch-test-1",
      })
    )
    expect(mockedConfirmedSave).toHaveBeenCalled()
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)

    const res = await POST(
      new Request("http://localhost/api/operation/catalog-image/confirmed-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedSlots: [] }),
      })
    )

    expect(res.status).toBe(401)
  })
})
