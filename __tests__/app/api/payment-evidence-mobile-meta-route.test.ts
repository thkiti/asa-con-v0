jest.mock("@/lib/pos/payment-evidence-upload-token", () => ({
  loadPaymentEvidenceMobileMeta: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { GET } from "@/app/api/payment-evidence/mobile/meta/route"
import { loadPaymentEvidenceMobileMeta } from "@/lib/pos/payment-evidence-upload-token"

const mockedLoad = loadPaymentEvidenceMobileMeta as jest.MockedFunction<
  typeof loadPaymentEvidenceMobileMeta
>

describe("GET /api/payment-evidence/mobile/meta", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedLoad.mockResolvedValue({
      receiptNo: "REC-SH001-202606-0001",
      branchCode: "SH001",
      branchName: "Chidlom",
      amount: "250.00",
      expiresAt: "2026-06-09T12:00:00.000Z",
      status: "PENDING",
    } as never)
  })

  it("returns mobile upload metadata", async () => {
    const res = await GET(
      new Request(
        "http://localhost/api/payment-evidence/mobile/meta?token=signed.token"
      )
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.receiptNo).toBe("REC-SH001-202606-0001")
    expect(body.branchName).toBe("Chidlom")
    expect(mockedLoad).toHaveBeenCalledWith(expect.anything(), "signed.token")
  })

  it("returns 400 when token is missing", async () => {
    const res = await GET(
      new Request("http://localhost/api/payment-evidence/mobile/meta")
    )
    expect(res.status).toBe(400)
  })
})
