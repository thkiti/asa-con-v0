import { POST } from "@/app/api/operation/catalog-image/open-file/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

import { getSession } from "@/lib/auth/session"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>

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

describe("POST /api/operation/catalog-image/open-file", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(hoSession)
  })

  it("validates PDF and returns client-side metadata without server storage", async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    const file = new File([pdfBytes], "catalog.pdf", { type: "application/pdf" })
    const formData = new FormData()
    formData.append("file", file)

    const res = await POST(
      new Request("http://localhost/api/operation/catalog-image/open-file", {
        method: "POST",
        body: formData,
      })
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      fileName: "catalog.pdf",
      clientSide: true,
      originalFileName: "catalog.pdf",
    })
  })

  it("returns 400 when request body is not multipart form data", async () => {
    const res = await POST(
      new Request("http://localhost/api/operation/catalog-image/open-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: "catalog.pdf" }),
      })
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        error: "PDF file upload is required",
        code: "VALIDATION_ERROR",
      })
    )
  })

  it("returns 413 when multipart body is truncated or too large", async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    const file = new File([pdfBytes], "large-catalog.pdf", {
      type: "application/pdf",
    })
    const formData = new FormData()
    formData.append("file", file)

    const request = new Request(
      "http://localhost/api/operation/catalog-image/open-file",
      {
        method: "POST",
        body: formData,
      }
    )
    jest
      .spyOn(request, "formData")
      .mockRejectedValue(new Error("expected boundary after body"))

    const res = await POST(request)

    expect(res.status).toBe(413)
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        error: "PDF file is too large. Maximum upload size is 50MB.",
        code: "PDF_FILE_TOO_LARGE",
      })
    )
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)

    const res = await POST(
      new Request("http://localhost/api/operation/catalog-image/open-file", {
        method: "POST",
        body: new FormData(),
      })
    )

    expect(res.status).toBe(401)
  })
})
