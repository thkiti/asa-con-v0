jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/payment-evidence-upload", () => ({
  uploadPaymentEvidenceForReceipt: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { POST } from "@/app/api/pos/payment-evidence/upload/route"
import { getSession } from "@/lib/auth/session"
import { uploadPaymentEvidenceForReceipt } from "@/lib/pos/payment-evidence-upload"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedUpload = uploadPaymentEvidenceForReceipt as jest.MockedFunction<
  typeof uploadPaymentEvidenceForReceipt
>

const shopSession = {
  sessionId: "s1",
  userId: "u1",
  role: "SH_STAFF" as const,
  staffId: "staff-1",
  name: "Shop",
  branchId: "branch-shop",
  branchCode: "SH001",
  branchName: "Shop Branch",
}

function postForm(receiptNo: string, fileContent = "fake-image") {
  const fd = new FormData()
  fd.set("receiptNo", receiptNo)
  fd.set("file", new Blob([fileContent], { type: "image/jpeg" }), "slip.jpg")
  return POST(new Request("http://localhost/api/pos/payment-evidence/upload", {
    method: "POST",
    body: fd,
  }))
}

describe("POST /api/pos/payment-evidence/upload", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(shopSession)
    mockedUpload.mockResolvedValue({
      evidenceId: "ev-1",
      receiptNo: "REC-SH001-202606-0001",
      status: "UPLOADED",
      blobPathname: "payment-slips/SH001/REC-SH001-202606-0001.jpg",
      blobUrl: "https://blob.example/slip.jpg",
    })
  })

  it("uploads evidence for authenticated shop session", async () => {
    const res = await postForm("REC-SH001-202606-0001")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(mockedUpload).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        branchId: "branch-shop",
        branchCode: "SH001",
        receiptNo: "REC-SH001-202606-0001",
      })
    )
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await postForm("REC-SH001-202606-0001")
    expect(res.status).toBe(401)
  })
})
