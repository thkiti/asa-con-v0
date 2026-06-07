import { POST } from "@/app/api/operation/catalog-image/open-file/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("fs/promises", () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/catalog-image/paths", () => {
  const actual = jest.requireActual<typeof import("@/lib/catalog-image/paths")>(
    "@/lib/catalog-image/paths"
  )
  return {
    ...actual,
    ensureCatalogImageDirs: jest.fn().mockResolvedValue(undefined),
  }
})

jest.mock("@/lib/catalog-image/config", () => ({
  getCatalogImageInputDir: jest.fn(() => "/tmp/catalog-input"),
}))

import { getSession } from "@/lib/auth/session"
import fs from "fs/promises"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedWriteFile = fs.writeFile as jest.Mock

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

  it("writes selected PDF to input dir", async () => {
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
    expect(body.fileName).toMatch(/^catalog-[a-f0-9]{12}\.pdf$/)
    expect(body.inputPath).toContain(body.fileName)
    expect(body.originalFileName).toBe("catalog.pdf")
    expect(mockedWriteFile).toHaveBeenCalledWith(
      expect.stringContaining(body.fileName),
      expect.any(Buffer)
    )
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
    expect(mockedWriteFile).not.toHaveBeenCalled()
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
    expect(mockedWriteFile).not.toHaveBeenCalled()
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
    expect(mockedWriteFile).not.toHaveBeenCalled()
  })
})
