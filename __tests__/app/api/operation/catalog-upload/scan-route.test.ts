import { GET } from "@/app/api/operation/catalog-upload/scan/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/catalog-upload/scan-local-images", () => ({
  scanCatalogProductImages: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { scanCatalogProductImages } from "@/lib/catalog-upload/scan-local-images"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedScan = scanCatalogProductImages as jest.MockedFunction<
  typeof scanCatalogProductImages
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

describe("GET /api/operation/catalog-upload/scan", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedScan.mockReset()
  })

  it("returns scan rows and image dir", async () => {
    mockedGetSession.mockResolvedValue(hoSession)
    mockedScan.mockResolvedValue({
      imageDir: "/tmp/catalog-images",
      rows: [
        {
          productCode: "0101015",
          fileName: "0101015.png",
          extension: ".png",
          sizeBytes: 1024,
          modifiedAt: "2026-06-06T00:00:00.000Z",
          productStatus: "MATCHED",
          localStatus: "OK",
          uploadStatus: "NOT_CHECKED",
        },
      ],
      duplicateBasenames: [],
    })

    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      imageDir: "/tmp/catalog-images",
      rows: [
        expect.objectContaining({
          productCode: "0101015",
          fileName: "0101015.png",
        }),
      ],
      duplicateBasenames: [],
    })
    expect(mockedScan).toHaveBeenCalled()
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)

    const res = await GET()
    expect(res.status).toBe(401)
    expect(mockedScan).not.toHaveBeenCalled()
  })
})
