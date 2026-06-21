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
  it("materializes derived debit line and credit allocation lines", async () => {
    const entry = {
      id: "REV-1",
      entryNo: "REV-260001",
      status: "CONFIRMED",
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate: new Date("2026-06-14T12:00:00.000Z"),
      receiveToAccountId: "bank-1",
      receivedFromName: "Customer A",
      description: "Service fee",
      lines: [
        {
          lineNo: 1,
          glAccountId: "rev-1",
          debit: new Prisma.Decimal("0"),
          credit: new Prisma.Decimal("3000"),
          memo: null,
          glAccount: { code: "4010", name: "Revenue" },
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
            glAccountId: "rev-1",
            credit: expect.anything(),
          }),
          expect.objectContaining({
            glAccountId: "bank-1",
            debit: expect.anything(),
          }),
        ]),
      })
    )
  })
})
