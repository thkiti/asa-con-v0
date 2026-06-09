jest.mock("@/lib/pos/payment-evidence-mobile-upload", () => ({
  uploadPaymentEvidenceWithToken: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { POST } from "@/app/api/payment-evidence/mobile/upload/route"
import { uploadPaymentEvidenceWithToken } from "@/lib/pos/payment-evidence-mobile-upload"

const mockedUpload = uploadPaymentEvidenceWithToken as jest.MockedFunction<
  typeof uploadPaymentEvidenceWithToken
>

function postForm(token: string, options?: { html?: boolean; fileContent?: string }) {
  const fd = new FormData()
  fd.set("token", token)
  if (options?.html) {
    fd.set("html", "1")
  }
  fd.set(
    "file",
    new Blob([options?.fileContent ?? "fake-image"], { type: "image/jpeg" }),
    "slip.jpg"
  )
  return POST(
    new Request("http://localhost/api/payment-evidence/mobile/upload", {
      method: "POST",
      body: fd,
    })
  )
}

describe("POST /api/payment-evidence/mobile/upload", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUpload.mockResolvedValue({
      evidenceId: "ev-1",
      receiptNo: "REC-SH001-202606-0001",
      status: "UPLOADED",
      blobPathname: "payment-slips/SH001/REC-SH001-202606-0001.jpg",
      blobUrl: "https://blob.example/slip.jpg",
    })
  })

  it("uploads evidence with token as JSON", async () => {
    const res = await postForm("signed.token")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(mockedUpload).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ token: "signed.token" })
    )
  })

  it("returns HTML success page for html form upload", async () => {
    const res = await postForm("signed.token", { html: true })
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toContain("text/html")
    const html = await res.text()
    expect(html).toContain("Upload complete")
    expect(html).toContain("You can close this page")
  })

  it("returns 400 when token is missing", async () => {
    const fd = new FormData()
    fd.set("file", new Blob(["x"], { type: "image/jpeg" }), "slip.jpg")
    const res = await POST(
      new Request("http://localhost/api/payment-evidence/mobile/upload", {
        method: "POST",
        body: fd,
      })
    )
    expect(res.status).toBe(400)
  })
})
