jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/payment-evidence-upload-token", () => ({
  mintPaymentEvidenceMobileUploadToken: jest.fn(),
  buildPaymentEvidenceMobileUploadUrl: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { POST } from "@/app/api/pos/payment-evidence/mobile-link/route"
import { getSession } from "@/lib/auth/session"
import {
  buildPaymentEvidenceMobileUploadUrl,
  mintPaymentEvidenceMobileUploadToken,
} from "@/lib/pos/payment-evidence-upload-token"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedMint = mintPaymentEvidenceMobileUploadToken as jest.MockedFunction<
  typeof mintPaymentEvidenceMobileUploadToken
>
const mockedBuildUrl = buildPaymentEvidenceMobileUploadUrl as jest.MockedFunction<
  typeof buildPaymentEvidenceMobileUploadUrl
>

const shopSession = {
  sessionId: "s1",
  userId: "u1",
  role: "SH_STAFF" as const,
  staffId: "staff-1",
  name: "Shop",
  branchId: "branch-shop",
  branchCode: "SH001",
  branchName: "Chidlom",
}

function postBody(receiptNo: string) {
  return POST(
    new Request("http://localhost/api/pos/payment-evidence/mobile-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiptNo }),
    })
  )
}

describe("POST /api/pos/payment-evidence/mobile-link", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.PAYMENT_EVIDENCE_UPLOAD_SECRET = "test-secret"
    mockedGetSession.mockResolvedValue(shopSession)
    mockedMint.mockResolvedValue({
      token: "signed.token",
      expiresAt: "2026-06-09T12:00:00.000Z",
    })
    mockedBuildUrl.mockReturnValue(
      "http://localhost/payment-evidence/mobile/signed.token"
    )
  })

  it("returns upload URL for authenticated shop session", async () => {
    const res = await postBody("REC-SH001-202606-0001")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.uploadUrl).toBe(
      "http://localhost/payment-evidence/mobile/signed.token"
    )
    expect(mockedMint).toHaveBeenCalledWith(
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
    const res = await postBody("REC-SH001-202606-0001")
    expect(res.status).toBe(401)
  })
})
