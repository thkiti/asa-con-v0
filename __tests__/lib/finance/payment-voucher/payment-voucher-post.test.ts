import { Prisma } from "@/generated/prisma/client"
import { postPaymentVoucher } from "@/lib/finance/payment-voucher/payment-voucher-post"

jest.mock("@/lib/finance/posting-period", () => ({
  assertPostingPeriodOpen: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/finance/posting", () => ({
  postOperationalVoucher: jest.fn().mockResolvedValue({
    voucherId: "v-1",
    voucherNo: "V-2026-06-00001",
    journalEntryId: "j-1",
    alreadyPosted: false,
  }),
}))

import { postOperationalVoucher } from "@/lib/finance/posting"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

describe("postPaymentVoucher", () => {
  it("materializes derived credit line and posts via kernel", async () => {
    const entry = {
      id: "PAV-1",
      entryNo: "PAV-260001",
      status: "CONFIRMED",
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate: new Date("2026-06-14T12:00:00.000Z"),
      payFromAccountId: "bank-1",
      payeeName: "ABC Co.",
      description: "Office supplies",
      lines: [
        {
          lineNo: 1,
          glAccountId: "exp-1",
          debit: new Prisma.Decimal("2000"),
          credit: new Prisma.Decimal("0"),
          memo: null,
          glAccount: { code: "5000", name: "Expense" },
        },
      ],
    }

    const tx = {
      paymentVoucher: {
        findUnique: jest.fn().mockResolvedValue(entry),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...entry, ...data, lines: entry.lines, status: "POSTED" })
        ),
      },
      glAccount: {
        findUnique: jest.fn().mockResolvedValue({
          id: "bank-1",
          code: "1100",
          accountType: "ASSET",
          isActive: true,
          deleted: false,
        }),
      },
    }

    await postPaymentVoucher({
      entryId: "PAV-1",
      postedByStaffId: "staff-1",
      tx: tx as never,
    })

    expect(postOperationalVoucher).toHaveBeenCalledWith(
      expect.objectContaining({
        refType: FINANCE_REF_TYPES.PAYMENT_VOUCHER,
        refId: "PAV-1",
        refNo: "PAV-260001",
        lines: expect.arrayContaining([
          expect.objectContaining({
            glAccountId: "exp-1",
            debit: expect.anything(),
            credit: expect.objectContaining({}),
          }),
          expect.objectContaining({
            glAccountId: "bank-1",
            credit: expect.anything(),
          }),
        ]),
      })
    )
  })
})
