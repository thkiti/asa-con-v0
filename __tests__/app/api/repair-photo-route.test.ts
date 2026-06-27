import { GET, POST } from "@/app/api/repair-photo/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@vercel/blob", () => ({
  put: jest.fn(),
}))

jest.mock("@/lib/pos/repair-photo-list", () => ({
  listRepairPhotos: jest.fn(),
}))

import { getSession } from "@/lib/auth/session"
import { put } from "@vercel/blob"
import { listRepairPhotos } from "@/lib/pos/repair-photo-list"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedPut = put as jest.MockedFunction<typeof put>
const mockedListRepairPhotos = listRepairPhotos as jest.MockedFunction<typeof listRepairPhotos>

const shopSession = {
  sessionId: "s1",
  userId: "u1",
  role: "SH_STAFF" as const,
  staffId: "002",
  name: "Shop User",
  branchId: "branch-1",
  branchCode: "SH001",
  branchName: "Shop Branch",
}

const validFileName = "REP-SH001-250607-0001-01.jpg"

function repairPhotoRequest(fileName = validFileName) {
  const fd = new FormData()
  fd.set("file", new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }), fileName)
  fd.set("fileName", fileName)
  return new Request("http://localhost/api/repair-photo", {
    method: "POST",
    body: fd,
  })
}

describe("POST /api/repair-photo", () => {
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN

  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(shopSession)
    mockedPut.mockResolvedValue({
      url: "https://blob.example/repair/REP-SH001-250607-0001-01.jpg",
      pathname: "repair/REP-SH001-250607-0001-01.jpg",
      downloadUrl:
        "https://blob.example/repair/REP-SH001-250607-0001-01.jpg?download=1",
      contentType: "image/jpeg",
      contentDisposition: "inline",
    })
  })

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = originalToken
    }
  })

  it("returns 401 when session is missing", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await POST(repairPhotoRequest())
    expect(res.status).toBe(401)
    expect(mockedPut).not.toHaveBeenCalled()
  })

  it("passes BLOB_READ_WRITE_TOKEN to put() when set", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "  test-blob-token  "

    const res = await POST(repairPhotoRequest())

    expect(res.status).toBe(200)
    expect(mockedPut).toHaveBeenCalledWith(
      `repair/${validFileName}`,
      expect.any(Buffer),
      expect.objectContaining({
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: false,
        allowOverwrite: true,
        token: "test-blob-token",
      })
    )
  })

  it("omits token so put() uses default resolver when env is unset", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN

    const res = await POST(repairPhotoRequest())

    expect(res.status).toBe(200)
    expect(mockedPut).toHaveBeenCalledWith(
      `repair/${validFileName}`,
      expect.any(Buffer),
      expect.objectContaining({
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: false,
        allowOverwrite: true,
      })
    )
    expect(mockedPut.mock.calls[0]?.[2]).not.toHaveProperty("token")
  })
})

describe("GET /api/repair-photo", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(shopSession)
    mockedListRepairPhotos.mockResolvedValue([
      {
        fileName: "REP-SH001-202606-0004-01.jpg",
        blobPath: "repair/REP-SH001-202606-0004-01.jpg",
        url: "https://blob.example/repair/REP-SH001-202606-0004-01.jpg",
      },
    ])
  })

  it("returns 401 when session is missing", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(mockedListRepairPhotos).not.toHaveBeenCalled()
  })

  it("returns branch-scoped photos with public urls", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(mockedListRepairPhotos).toHaveBeenCalledWith("SH001")
    await expect(res.json()).resolves.toEqual({
      photos: [
        {
          fileName: "REP-SH001-202606-0004-01.jpg",
          blobPath: "repair/REP-SH001-202606-0004-01.jpg",
          url: "https://blob.example/repair/REP-SH001-202606-0004-01.jpg",
        },
      ],
    })
  })
})
