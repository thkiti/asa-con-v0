jest.mock("@/lib/pos/payment-evidence-upload-token", () => ({
  loadPaymentEvidenceMobileMeta: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { GET } from "@/app/payment-evidence/mobile/[...token]/route"
import { loadPaymentEvidenceMobileMeta } from "@/lib/pos/payment-evidence-upload-token"

const mockedLoad = loadPaymentEvidenceMobileMeta as jest.MockedFunction<
  typeof loadPaymentEvidenceMobileMeta
>

describe("GET /payment-evidence/mobile/[...token]", () => {
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

  it("returns HTML upload form", async () => {
    const res = await GET(new Request("http://localhost/payment-evidence/mobile/signed.token"), {
      params: Promise.resolve({ token: ["signed.token"] }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toContain("text/html")
    const html = await res.text()
    expect(html).toContain("REC-SH001-202606-0001")
    expect(html).toContain('action="/api/payment-evidence/mobile/upload"')
    expect(mockedLoad).toHaveBeenCalledWith(expect.anything(), "signed.token")
  })

  it("joins catch-all token segments", async () => {
    await GET(new Request("http://localhost/payment-evidence/mobile/a/b"), {
      params: Promise.resolve({ token: ["a", "b"] }),
    })
    expect(mockedLoad).toHaveBeenCalledWith(expect.anything(), "a.b")
  })
})
