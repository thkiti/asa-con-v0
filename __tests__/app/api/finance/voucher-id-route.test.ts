import { NextRequest } from "next/server"
import { VoucherReadError } from "@/lib/finance/voucher-read-errors"
import { getVoucherDetailById } from "@/lib/finance/voucher-read"
import { GET } from "@/app/api/finance/vouchers/[id]/route"
import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import { prisma } from "@/lib/shared/prisma"

jest.mock("@/lib/finance/voucher-read", () => ({
  getVoucherDetailById: jest.fn(),
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

const mockGetVoucherDetailById = getVoucherDetailById as jest.MockedFunction<
  typeof getVoucherDetailById
>

const sessionAs = { documentEntityCode: "AS" as const }

const voucherDetail = {
  id: "voucher-1",
  voucherNo: "V-2026-0001",
  legalEntityCode: "AS",
  periodKey: "2026-05",
  date: "2026-05-01T00:00:00.000Z",
  status: "POSTED",
  branchId: "branch-1",
  refType: "POS_SALE",
  refId: "sale-1",
  refNo: null,
  description: "POS checkout",
  postedAt: "2026-05-01T12:00:00.000Z",
  documentHeader: null,
  lines: [],
  journal: null,
}

describe("GET finance/vouchers/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSession as jest.Mock).mockResolvedValue(sessionAs)
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue({ staffId: "staff-1" })
  })

  it("returns voucher detail scoped to session entity", async () => {
    mockGetVoucherDetailById.mockResolvedValue(voucherDetail)

    const req = new NextRequest("http://localhost/api/finance/vouchers/voucher-1")
    const res = await GET(req, { params: Promise.resolve({ id: "voucher-1" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ voucher: voucherDetail })
    expect(mockGetVoucherDetailById).toHaveBeenCalledWith(prisma, "voucher-1", "AS")
  })

  it("returns 404 when voucher belongs to another entity", async () => {
    mockGetVoucherDetailById.mockRejectedValue(
      new VoucherReadError("Voucher not found", "NOT_FOUND")
    )

    const req = new NextRequest("http://localhost/api/finance/vouchers/missing")
    const res = await GET(req, { params: Promise.resolve({ id: "missing" }) })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      error: "Voucher not found",
      code: "NOT_FOUND",
    })
    expect(mockGetVoucherDetailById).toHaveBeenCalledWith(prisma, "missing", "AS")
  })
})
