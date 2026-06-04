import { GET } from "@/app/api/pos/receipt-no/preview/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/receipt", () => ({
  previewNextReceiptNo: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { previewNextReceiptNo } from "@/lib/pos/receipt"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedPreview = previewNextReceiptNo as jest.MockedFunction<
  typeof previewNextReceiptNo
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

describe("GET /api/pos/receipt-no/preview", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedPreview.mockReset()
  })

  it("returns preview receipt number without allocating", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedPreview.mockResolvedValue("REC-SH001-202606-0003")

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      receiptNo: "REC-SH001-202606-0003",
      preview: true,
    })
    expect(mockedPreview).toHaveBeenCalledWith(expect.anything(), "branch-shop")
  })
})
