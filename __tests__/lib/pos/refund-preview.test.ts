import { Prisma, SaleStatus } from "@/generated/prisma/client"
import { getRefundPreview } from "@/lib/pos/refund"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    sale: { findFirst: jest.fn() },
    refund: { aggregate: jest.fn() },
  },
}))

import { prisma } from "@/lib/shared/prisma"

const mockedSaleFindFirst = prisma.sale.findFirst as jest.Mock
const mockedRefundAggregate = prisma.refund.aggregate as jest.Mock

describe("getRefundPreview", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("includes sale line items for display", async () => {
    mockedSaleFindFirst.mockResolvedValue({
      id: "sale-1",
      total: new Prisma.Decimal("100.00"),
      receipt: { id: "rcpt-1", receiptNo: "REC-SH001-202606-0001" },
      items: [
        {
          qty: 1,
          lineTotal: new Prisma.Decimal("50.00"),
          product: { name: "0101 KEY BLANK A" },
        },
        {
          qty: 2,
          lineTotal: new Prisma.Decimal("50.00"),
          product: { name: "0202 CUTTING SERVICE" },
        },
      ],
    })
    mockedRefundAggregate.mockResolvedValue({ _sum: { amount: null } })

    const preview = await getRefundPreview(prisma, {
      saleId: "sale-1",
      branchId: "branch-1",
    })

    expect(preview.items).toEqual([
      { name: "0101 KEY BLANK A", qty: 1, lineTotal: "50.00" },
      { name: "0202 CUTTING SERVICE", qty: 2, lineTotal: "50.00" },
    ])
    expect(mockedSaleFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sale-1", branchId: "branch-1", status: SaleStatus.COMPLETED },
        include: expect.objectContaining({
          items: expect.any(Object),
        }),
      })
    )
  })
})
