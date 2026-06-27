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
  it("posts stored voucher lines directly without derived petty cash credit", async () => {
    const entry = {
      id: "PCV-1",
      entryNo: "PCV-260001",
      status: "CONFIRMED",
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate: new Date("2026-06-14T12:00:00.000Z"),
      pettyCashAccountId: "petty-1",
      payeeName: "ABC Co.",
      description: "Service with WHT",
      lines: [
        {
          lineNo: 1,
          glAccountId: "exp-1",
          debit: new Prisma.Decimal("10000"),
          credit: new Prisma.Decimal("0"),
          memo: "Service",
          glAccount: { code: "5100", name: "Service Expense" },
        },
        {
          lineNo: 2,
          glAccountId: "wht-1",
          debit: new Prisma.Decimal("0"),
          credit: new Prisma.Decimal("300"),
          memo: "WHT",
          glAccount: { code: "2200", name: "WHT Payable" },
        },
        {
          lineNo: 3,
          glAccountId: "petty-1",
          debit: new Prisma.Decimal("0"),
          credit: new Prisma.Decimal("9700"),
          memo: "Petty cash",
          glAccount: { code: "1011", name: "Petty Cash" },
        },
      ],
    }

    const tx = {
      pettyCashVoucher: {
        findFirst: jest.fn().mockResolvedValue(entry),
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
        findMany: jest.fn().mockResolvedValue([
          { id: "exp-1", code: "5100", isActive: true, deleted: false },
          { id: "wht-1", code: "2200", isActive: true, deleted: false },
          { id: "petty-1", code: "1011", isActive: true, deleted: false },
        ]),
      },
    }

    await postPettyCashVoucher({
      entryId: "PCV-1",
      legalEntityCode: "AS",
      postedByStaffId: "staff-1",
      tx: tx as never,
    })

    expect(postOperationalVoucher).toHaveBeenCalledWith(
      expect.objectContaining({
        refType: FINANCE_REF_TYPES.PETTY_CASH_VOUCHER,
        refId: "PCV-1",
        refNo: "PCV-260001",
        lines: expect.arrayContaining([
          expect.objectContaining({ glAccountId: "exp-1" }),
          expect.objectContaining({ glAccountId: "wht-1" }),
          expect.objectContaining({ glAccountId: "petty-1" }),
        ]),
      })
    )

    const postedLines = (postOperationalVoucher as jest.Mock).mock.calls[0][0].lines
    expect(postedLines).toHaveLength(3)
  })
})
