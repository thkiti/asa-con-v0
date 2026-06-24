import { Prisma } from "@/generated/prisma/client"
import { postRevenueVoucher } from "@/lib/finance/revenue-voucher/revenue-voucher-post"

jest.mock("@/lib/finance/posting-period", () => ({
  assertPostingPeriodOpen: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/finance/posting", () => ({
  postOperationalVoucher: jest.fn().mockResolvedValue({
    voucherId: "v-rev-1",
    voucherNo: "V-2026-06-00002",
    journalEntryId: "j-rev-1",
    alreadyPosted: false,
  }),
}))

import { postOperationalVoucher } from "@/lib/finance/posting"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

describe("postRevenueVoucher", () => {
  it("posts stored voucher lines directly without derived balancing line", async () => {
    const entry = {
      id: "REV-1",
      entryNo: "REV-260001",
      status: "CONFIRMED",
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate: new Date("2026-06-14T12:00:00.000Z"),
      receiveToAccountId: "bank-1",
      receivedFromName: "Customer A",
      description: "AR collection with fee",
      lines: [
        {
          lineNo: 1,
          glAccountId: "bank-1",
          debit: new Prisma.Decimal("9700"),
          credit: new Prisma.Decimal("0"),
          memo: "Bank receipt",
          glAccount: { code: "1021001", name: "Bank" },
        },
        {
          lineNo: 2,
          glAccountId: "fee-1",
          debit: new Prisma.Decimal("300"),
          credit: new Prisma.Decimal("0"),
          memo: "Collection fee",
          glAccount: { code: "5200", name: "Collection Fee" },
        },
        {
          lineNo: 3,
          glAccountId: "ar-1",
          debit: new Prisma.Decimal("0"),
          credit: new Prisma.Decimal("10000"),
          memo: "AR clearance",
          glAccount: { code: "1200", name: "Accounts Receivable" },
        },
      ],
    }

    const tx = {
      revenueVoucher: {
        findUnique: jest.fn().mockResolvedValue(entry),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...entry, ...data, lines: entry.lines, status: "POSTED" })
        ),
      },
      glAccount: {
        findUnique: jest.fn().mockResolvedValue({
          id: "bank-1",
          code: "1021001",
          accountType: "ASSET",
          isActive: true,
          deleted: false,
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: "bank-1",
            code: "1021001",
            isActive: true,
            deleted: false,
          },
          {
            id: "fee-1",
            code: "5200",
            isActive: true,
            deleted: false,
          },
          {
            id: "ar-1",
            code: "1200",
            isActive: true,
            deleted: false,
          },
        ]),
      },
    }

    await postRevenueVoucher({
      entryId: "REV-1",
      postedByStaffId: "staff-1",
      tx: tx as never,
    })

    expect(postOperationalVoucher).toHaveBeenCalledWith(
      expect.objectContaining({
        refType: FINANCE_REF_TYPES.REVENUE_VOUCHER,
        refId: "REV-1",
        refNo: "REV-260001",
        lines: expect.arrayContaining([
          expect.objectContaining({
            glAccountId: "bank-1",
            debit: expect.anything(),
          }),
          expect.objectContaining({
            glAccountId: "fee-1",
            debit: expect.anything(),
          }),
          expect.objectContaining({
            glAccountId: "ar-1",
            credit: expect.anything(),
          }),
        ]),
      })
    )

    const postedLines = (postOperationalVoucher as jest.Mock).mock.calls[0][0].lines
    expect(postedLines).toHaveLength(3)
  })
})
