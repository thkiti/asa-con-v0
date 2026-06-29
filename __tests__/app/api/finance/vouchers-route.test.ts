import { NextRequest } from "next/server"
import { GET } from "@/app/api/finance/vouchers/route"
import { listFinanceDocuments } from "@/lib/finance/inquiry/finance-document-inquiry"
import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import { prisma } from "@/lib/shared/prisma"
import { PeriodAdminAuthError } from "@/lib/auth"

jest.mock("@/lib/finance/inquiry/finance-document-inquiry", () => ({
  listFinanceDocuments: jest.fn(),
}))

jest.mock("@/lib/auth", () => {
  const actual = jest.requireActual("@/lib/auth")
  return {
    ...actual,
    getSession: jest.fn(),
    requirePeriodAdminActor: jest.fn(),
  }
})

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { mocked: true },
}))

const mockListFinanceDocuments = listFinanceDocuments as jest.MockedFunction<
  typeof listFinanceDocuments
>

const sessionAs = { documentEntityCode: "AS" as const }

describe("GET finance/vouchers", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSession as jest.Mock).mockResolvedValue(sessionAs)
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue({ staffId: "staff-1" })
    mockListFinanceDocuments.mockResolvedValue({ documents: [], total: 0 })
  })

  it("returns document inquiry list scoped to session entity", async () => {
    mockListFinanceDocuments.mockResolvedValue({
      documents: [
        {
          id: "voucher-1",
          rowKind: "posted",
          legalEntityCode: "AS",
          documentTypeCode: "COL",
          documentNo: "COL-260001",
          voucherNo: "V-2026-06-00001",
          date: "2026-06-14T00:00:00.000Z",
          periodKey: "2026-06",
          branchId: "branch-1",
          branchCode: "SH001",
          branchName: "Shop 1",
          status: "POSTED",
          amount: "1000",
          journalEntryId: "journal-1",
          operationalDocumentId: null,
          pdfAvailable: null,
          inquiryPath: "/finance/vouchers/voucher-1",
          printPath: null,
        },
      ],
      total: 1,
    })

    const req = new NextRequest(
      "http://localhost/api/finance/vouchers?documentNo=COL-260001&from=2026-06-01&to=2026-06-30&postingState=posted&branchId=branch-1"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      documents: [
        expect.objectContaining({
          voucherNo: "V-2026-06-00001",
          documentNo: "COL-260001",
          legalEntityCode: "AS",
        }),
      ],
      total: 1,
    })
    expect(mockListFinanceDocuments).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        legalEntityCode: "AS",
        refNo: "COL-260001",
        postingState: "posted",
        branchId: "branch-1",
      })
    )
  })

  it("blocks unauthorized roles", async () => {
    ;(requirePeriodAdminActor as jest.Mock).mockImplementation(() => {
      throw new PeriodAdminAuthError("Insufficient permissions", "FORBIDDEN", 403)
    })

    const req = new NextRequest("http://localhost/api/finance/vouchers")
    const res = await GET(req)

    expect(res.status).toBe(403)
    expect(mockListFinanceDocuments).not.toHaveBeenCalled()
  })
})
