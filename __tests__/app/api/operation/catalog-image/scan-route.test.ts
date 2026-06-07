import { GET } from "@/app/api/operation/catalog-image/scan/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/catalog-image/paths", () => ({
  listInputPdfFiles: jest.fn(),
}))

jest.mock("@/lib/catalog-image/config", () => ({
  getCatalogImageInputDir: jest.fn(() => "/tmp/catalog-input"),
}))

import { getSession } from "@/lib/auth/session"
import { listInputPdfFiles } from "@/lib/catalog-image/paths"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedList = listInputPdfFiles as jest.MockedFunction<typeof listInputPdfFiles>

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

describe("GET /api/operation/catalog-image/scan", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedList.mockReset()
  })

  it("returns pdf files only from listInputPdfFiles", async () => {
    mockedGetSession.mockResolvedValue(hoSession)
    mockedList.mockResolvedValue([
      {
        fileName: "catalog.pdf",
        sizeBytes: 1024,
        modifiedAt: "2026-06-06T00:00:00.000Z",
      },
    ])

    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      inputDir: "/tmp/catalog-input",
      files: [
        expect.objectContaining({ fileName: "catalog.pdf" }),
      ],
    })
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)

    const res = await GET()
    expect(res.status).toBe(401)
    expect(mockedList).not.toHaveBeenCalled()
  })
})
