import { GET } from "@/app/api/operation/catalog-image/page-preview/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/catalog-image/paths", () => ({
  resolveInputPdfPath: jest.fn((fileName: string) => `/tmp/input/${fileName}`),
}))

jest.mock("fs/promises", () => ({
  access: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/catalog-image/page-preview", () => ({
  renderCatalogPagePreview: jest.fn(),
}))

import { getSession } from "@/lib/auth/session"
import { renderCatalogPagePreview } from "@/lib/catalog-image/page-preview"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedRender = renderCatalogPagePreview as jest.MockedFunction<
  typeof renderCatalogPagePreview
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

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe("GET /api/operation/catalog-image/page-preview", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedRender.mockReset()
    mockedGetSession.mockResolvedValue(hoSession)
    mockedRender.mockResolvedValue(Buffer.concat([PNG_HEADER, Buffer.from("x")]))
  })

  it("returns image/png for page preview request", async () => {
    const req = new Request(
      "http://localhost/api/operation/catalog-image/page-preview?fileName=catalog.pdf&rotateDeg=180"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/png")
    expect(mockedRender).toHaveBeenCalledWith("/tmp/input/catalog.pdf", 180, 1)
  })

  it("passes pageNo query to renderCatalogPagePreview", async () => {
    const req = new Request(
      "http://localhost/api/operation/catalog-image/page-preview?fileName=catalog.pdf&rotateDeg=180&pageNo=3"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(mockedRender).toHaveBeenCalledWith("/tmp/input/catalog.pdf", 180, 3)
  })

  it("returns 400 for invalid pageNo", async () => {
    const req = new Request(
      "http://localhost/api/operation/catalog-image/page-preview?fileName=catalog.pdf&pageNo=0"
    )
    const res = await GET(req)

    expect(res.status).toBe(400)
    expect(mockedRender).not.toHaveBeenCalled()
  })

  it("returns 400 when fileName is missing", async () => {
    const req = new Request(
      "http://localhost/api/operation/catalog-image/page-preview"
    )
    const res = await GET(req)

    expect(res.status).toBe(400)
    expect(mockedRender).not.toHaveBeenCalled()
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)

    const req = new Request(
      "http://localhost/api/operation/catalog-image/page-preview?fileName=catalog.pdf"
    )
    const res = await GET(req)

    expect(res.status).toBe(401)
    expect(mockedRender).not.toHaveBeenCalled()
  })
})
