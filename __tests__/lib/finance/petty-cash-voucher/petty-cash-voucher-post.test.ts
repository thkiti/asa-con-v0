import { Prisma } from "@/generated/prisma/client"
import { postPettyCashVoucher } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-post"

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

describe("postPettyCashVoucher", () => {
  it("materializes derived petty cash credit line and posts via kernel", async () => {
    const entry = {
      id: "PCV-1",
      entryNo: "PCV-260001",
      status: "CONFIRMED",
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate: new Date("2026-06-14T12:00:00.000Z"),
      pettyCashAccountId: "petty-1",
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
      pettyCashVoucher: {
        findUnique: jest.fn().mockResolvedValue(entry),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...entry, ...data, lines: entry.lines, status: "POSTED" })
        ),
      },
      glAccount: {
        findUnique: jest.fn().mockResolvedValue({
          id: "petty-1",
          code: "1011",
          name: "เงินสดย่อย",
          accountType: "ASSET",
          isActive: true,
          deleted: false,
        }),
      },
    }

    await postPettyCashVoucher({
      entryId: "PCV-1",
      postedByStaffId: "staff-1",
      tx: tx as never,
    })

    expect(postOperationalVoucher).toHaveBeenCalledWith(
      expect.objectContaining({
        refType: FINANCE_REF_TYPES.PETTY_CASH_VOUCHER,
        refId: "PCV-1",
        refNo: "PCV-260001",
        lines: expect.arrayContaining([
          expect.objectContaining({
            glAccountId: "exp-1",
            debit: expect.anything(),
            credit: expect.objectContaining({}),
          }),
          expect.objectContaining({
            glAccountId: "petty-1",
            credit: expect.anything(),
          }),
        ]),
      })
    )
  })
})
