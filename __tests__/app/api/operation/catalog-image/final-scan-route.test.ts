import { GET } from "@/app/api/operation/catalog-image/final-scan/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/catalog-image/paths", () => ({
  listFinalWorkFiles: jest.fn(),
}))

jest.mock("@/lib/catalog-image/config", () => ({
  getCatalogImageFinalDir: jest.fn(() => "/tmp/catalog-work/final"),
}))

import { getSession } from "@/lib/auth/session"
import { listFinalWorkFiles } from "@/lib/catalog-image/paths"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedList = listFinalWorkFiles as jest.MockedFunction<typeof listFinalWorkFiles>

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

describe("GET /api/operation/catalog-image/final-scan", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(hoSession)
  })

  it("returns png files only from final folder", async () => {
    mockedList.mockResolvedValue([
      {
        fileName: "0101015.png",
        sizeBytes: 2048,
        modifiedAt: "2026-06-06T00:00:00.000Z",
      },
    ])

    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      finalDir: "/tmp/catalog-work/final",
      files: [expect.objectContaining({ fileName: "0101015.png" })],
    })
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)

    const res = await GET()
    expect(res.status).toBe(401)
    expect(mockedList).not.toHaveBeenCalled()
  })
})
