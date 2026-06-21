import { Prisma } from "@/generated/prisma/client"
import { createPaymentVoucherDraft } from "@/lib/finance/payment-voucher/payment-voucher-save"

describe("createPaymentVoucherDraft", () => {
  it("creates DRAFT with PAV entry number and debit-only lines", async () => {
    const created = {
      id: "PAV-1",
      entryNo: "PAV-260001",
      status: "DRAFT",
      totalAmount: new Prisma.Decimal("1500"),
      lines: [
        {
          lineNo: 1,
          glAccountId: "exp-1",
          debit: new Prisma.Decimal("1500"),
          credit: new Prisma.Decimal("0"),
        },
      ],
    }

    const tx = {
      glAccount: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: "bank-1",
            code: "1100",
            accountType: "ASSET",
            isActive: true,
            deleted: false,
          })
          .mockResolvedValueOnce({
            id: "exp-1",
            code: "5000",
            isActive: true,
            deleted: false,
          }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: "exp-1",
            code: "5000",
            isActive: true,
            deleted: false,
          },
        ]),
      },
      paymentVoucher: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(created),
      },
    }

    const result = await createPaymentVoucherDraft({
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate: "2026-06-14",
      payFromAccountId: "bank-1",
      payeeName: "ABC Co.",
      createdByStaffId: "staff-1",
      lines: [{ accountCode: "5000", debit: "1500" }],
      tx: tx as never,
    })

    expect(result.entryNo).toBe("PAV-260001")
    expect(tx.paymentVoucher.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entryNo: "PAV-260001",
          payeeName: "ABC Co.",
          payFromAccountId: "bank-1",
        }),
      })
    )
  })
})
