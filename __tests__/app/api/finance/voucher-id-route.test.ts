import { NextRequest } from "next/server"
import { VoucherReadError } from "@/lib/finance/voucher-read-errors"
import { getVoucherDetailById } from "@/lib/finance/voucher-read"
import { GET } from "@/app/api/finance/vouchers/[id]/route"
import { prisma } from "@/lib/shared/prisma"

jest.mock("@/lib/finance/voucher-read", () => ({
  getVoucherDetailById: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { mocked: true },
}))

const mockGetVoucherDetailById = getVoucherDetailById as jest.MockedFunction<
  typeof getVoucherDetailById
>

const voucherDetail = {
  id: "voucher-1",
  voucherNo: "V-2026-0001",
  date: "2026-05-01T00:00:00.000Z",
  status: "POSTED",
  branchId: "branch-1",
  refType: "POS_SALE",
  refId: "sale-1",
  refNo: null,
  description: "POS checkout",
  postedAt: "2026-05-01T12:00:00.000Z",
  lines: [],
  journal: null,
}

describe("GET finance/vouchers/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns voucher detail", async () => {
    mockGetVoucherDetailById.mockResolvedValue(voucherDetail)

    const req = new NextRequest("http://localhost/api/finance/vouchers/voucher-1")
    const res = await GET(req, { params: Promise.resolve({ id: "voucher-1" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ voucher: voucherDetail })
    expect(mockGetVoucherDetailById).toHaveBeenCalledWith(prisma, "voucher-1")
  })

  it("returns 404 when voucher is missing", async () => {
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
  })
})
