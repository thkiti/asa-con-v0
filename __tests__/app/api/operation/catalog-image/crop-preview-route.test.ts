import { POST } from "@/app/api/operation/catalog-image/crop-preview/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/catalog-image/paths", () => ({
  resolveInputPdfPath: jest.fn((fileName: string) => `/tmp/input/${fileName}`),
}))

jest.mock("fs/promises", () => ({
  access: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/catalog-image/crop-pdf", () => ({
  cropCatalogPdf: jest.fn(),
}))

import { getSession } from "@/lib/auth/session"
import { cropCatalogPdf } from "@/lib/catalog-image/crop-pdf"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedCrop = cropCatalogPdf as jest.MockedFunction<typeof cropCatalogPdf>

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

describe("POST /api/operation/catalog-image/crop-preview", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedCrop.mockReset()
    mockedGetSession.mockResolvedValue(hoSession)
    mockedCrop.mockResolvedValue({ batchId: "batch-1", pages: [] })
  })

  it("passes crop template fields to cropCatalogPdf", async () => {
    const req = new Request("http://localhost/api/operation/catalog-image/crop-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "catalog.pdf",
        rotateDeg: 180,
        columns: 3,
        rows: 2,
        cropX: 120,
        cropY: 40,
        cropWidth: 980,
        cropHeight: 1260,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockedCrop).toHaveBeenCalledWith(
      expect.objectContaining({
        pdfPath: "/tmp/input/catalog.pdf",
        rotateDeg: 180,
        columns: 3,
        rows: 2,
        cropArea: {
          cropX: 120,
          cropY: 40,
          cropWidth: 980,
          cropHeight: 1260,
        },
      })
    )
  })

  it("passes pageNo to cropCatalogPdf when provided", async () => {
    const req = new Request("http://localhost/api/operation/catalog-image/crop-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "catalog.pdf",
        rotateDeg: 180,
        columns: 3,
        rows: 2,
        pageNo: 2,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockedCrop).toHaveBeenCalledWith(
      expect.objectContaining({
        pageNo: 2,
      })
    )
  })

  it("omits pageNo for full PDF crop when not provided", async () => {
    const req = new Request("http://localhost/api/operation/catalog-image/crop-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "catalog.pdf",
        rotateDeg: 180,
        columns: 3,
        rows: 2,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockedCrop).toHaveBeenCalledWith(
      expect.not.objectContaining({
        pageNo: expect.anything(),
      })
    )
  })

  it("falls back to full-page crop when crop fields are omitted", async () => {
    const req = new Request("http://localhost/api/operation/catalog-image/crop-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "catalog.pdf",
        rotateDeg: 180,
        columns: 3,
        rows: 2,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockedCrop).toHaveBeenCalledWith(
      expect.objectContaining({
        cropArea: null,
      })
    )
  })

  it("rejects invalid crop template", async () => {
    const req = new Request("http://localhost/api/operation/catalog-image/crop-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "catalog.pdf",
        cropX: 10,
        cropY: 20,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: "INVALID_CROP_TEMPLATE",
    })
    expect(mockedCrop).not.toHaveBeenCalled()
  })
})
