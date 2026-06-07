import { POST } from "@/app/api/operation/catalog-image/save-matched/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/catalog-image/save-matched", () => ({
  saveMatchedCatalogImages: jest.fn(),
}))

import { getSession } from "@/lib/auth/session"
import { saveMatchedCatalogImages } from "@/lib/catalog-image/save-matched"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedSave = saveMatchedCatalogImages as jest.MockedFunction<
  typeof saveMatchedCatalogImages
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

describe("POST /api/operation/catalog-image/save-matched", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(hoSession)
    mockedSave.mockResolvedValue([
      {
        productCode: "0101015",
        finalFilePath: "/tmp/catalog-work/final/0101015.png",
        finalFileName: "0101015.png",
        status: "SAVED",
      },
    ])
  })

  it("delegates items to saveMatchedCatalogImages", async () => {
    const res = await POST(
      new Request("http://localhost/api/operation/catalog-image/save-matched", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              productCode: "0101015",
              localFilePath: "/tmp/catalog-work/batch/page-1/slot-1.png",
            },
          ],
        }),
      })
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      items: [
        expect.objectContaining({
          productCode: "0101015",
          finalFileName: "0101015.png",
          status: "SAVED",
        }),
      ],
    })
    expect(mockedSave).toHaveBeenCalled()
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)

    const res = await POST(
      new Request("http://localhost/api/operation/catalog-image/save-matched", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [] }),
      })
    )

    expect(res.status).toBe(401)
    expect(mockedSave).not.toHaveBeenCalled()
  })
})
