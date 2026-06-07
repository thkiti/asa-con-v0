import { POST } from "@/app/api/operation/catalog-image/upload-to-cloud/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/catalog-image/vercel-blob", () => ({
  uploadProductImagesToBlob: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { product: { findUnique: jest.fn() } },
}))

import { getSession } from "@/lib/auth/session"
import { uploadProductImagesToBlob } from "@/lib/catalog-image/vercel-blob"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedUpload = uploadProductImagesToBlob as jest.MockedFunction<
  typeof uploadProductImagesToBlob
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

describe("POST /api/operation/catalog-image/upload-to-cloud", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(hoSession)
    mockedUpload.mockResolvedValue({
      results: [
        {
          productCode: "0101015",
          status: "UPLOADED",
          cloudPath: "products/0101015.png",
          url: "https://blob.example/products/0101015.png",
        },
      ],
      summary: {
        uploaded: 1,
        skippedExists: 0,
        localMissing: 0,
        localDuplicate: 0,
        unmatchedProduct: 0,
        error: 0,
      },
    })
  })

  it("delegates to uploadProductImagesToBlob", async () => {
    const res = await POST(
      new Request(
        "http://localhost/api/operation/catalog-image/upload-to-cloud",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productCodes: ["0101015", "0202020"] }),
        }
      )
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        summary: expect.objectContaining({ uploaded: 1 }),
      })
    )
    expect(mockedUpload).toHaveBeenCalledWith(["0101015", "0202020"])
  })

  it("empty body calls uploadProductImagesToBlob with db for scan-all", async () => {
    const res = await POST(
      new Request(
        "http://localhost/api/operation/catalog-image/upload-to-cloud",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      )
    )

    expect(res.status).toBe(200)
    expect(mockedUpload).toHaveBeenCalledWith([], { db: expect.anything() })
  })

  it("empty productCodes array calls uploadProductImagesToBlob with db", async () => {
    const res = await POST(
      new Request(
        "http://localhost/api/operation/catalog-image/upload-to-cloud",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productCodes: [] }),
        }
      )
    )

    expect(res.status).toBe(200)
    expect(mockedUpload).toHaveBeenCalledWith([], { db: expect.anything() })
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)

    const res = await POST(
      new Request(
        "http://localhost/api/operation/catalog-image/upload-to-cloud",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productCodes: [] }),
        }
      )
    )

    expect(res.status).toBe(401)
  })
})
