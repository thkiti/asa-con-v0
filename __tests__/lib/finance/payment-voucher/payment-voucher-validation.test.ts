import { Prisma } from "@/generated/prisma/client"
import { PaymentVoucherErrorCodes } from "@/lib/finance/payment-voucher/payment-voucher-errors"
import {
  assertCanSubmitPaymentVoucher,
  assertEligiblePayFromAccount,
  assertPaymentVoucherLineSides,
} from "@/lib/finance/payment-voucher/payment-voucher-validation"

describe("assertEligiblePayFromAccount", () => {
  it("rejects non-asset PAV-from accounts", async () => {
    const tx = {
      glAccount: {
        findUnique: jest.fn().mockResolvedValue({
          id: "exp-1",
          code: "5000",
          accountType: "EXPENSE",
          isActive: true,
          deleted: false,
        }),
      },
    }

    await expect(
      assertEligiblePayFromAccount(tx as never, "exp-1")
    ).rejects.toMatchObject({
      code: PaymentVoucherErrorCodes.INVALID_PAY_FROM_ACCOUNT,
    })
  })

  it("accepts asset control accounts", async () => {
    const tx = {
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

    await expect(
      assertEligiblePayFromAccount(tx as never, "bank-1")
    ).resolves.toBeUndefined()
  })
})

describe("assertPaymentVoucherLineSides", () => {
  it("rejects both debit and credit on one line", () => {
    expect(() =>
      assertPaymentVoucherLineSides(
        new Prisma.Decimal("100"),
        new Prisma.Decimal("50"),
        0
      )
    ).toThrow(/cannot have both debit and credit/)
  })

  it("accepts debit-only line", () => {
    expect(() =>
      assertPaymentVoucherLineSides(
        new Prisma.Decimal("100"),
        new Prisma.Decimal("0")
      )
    ).not.toThrow()
  })
})

describe("assertCanSubmitPaymentVoucher", () => {
  const baseEntry = {
    payFromAccountId: "bank-1",
    payeeName: "Landlord",
    lines: [
      {
        lineNo: 1,
        glAccountId: "rent-1",
        debit: new Prisma.Decimal("10000"),
        credit: new Prisma.Decimal("0"),
      },
      {
        lineNo: 2,
        glAccountId: "wht-1",
        debit: new Prisma.Decimal("0"),
        credit: new Prisma.Decimal("500"),
      },
      {
        lineNo: 3,
        glAccountId: "bank-1",
        debit: new Prisma.Decimal("0"),
        credit: new Prisma.Decimal("9500"),
      },
    ],
  }

  it("requires balanced lines and pay-from credit", async () => {
    const tx = {
      glAccount: {
        findUnique: jest.fn().mockResolvedValue({
          id: "bank-1",
          code: "1100",
          accountType: "ASSET",
          isActive: true,
          deleted: false,
        }),
        findMany: jest.fn().mockResolvedValue([
          { id: "rent-1", code: "5100", isActive: true, deleted: false },
          { id: "wht-1", code: "2200", isActive: true, deleted: false },
          { id: "bank-1", code: "1100", isActive: true, deleted: false },
        ]),
      },
    }

    await expect(
      assertCanSubmitPaymentVoucher(tx as never, baseEntry as never)
    ).resolves.toBeUndefined()
  })

  it("rejects when pay-from account has no credit line", async () => {
    const tx = {
      glAccount: {
        findUnique: jest.fn().mockResolvedValue({
          id: "bank-1",
          code: "1100",
          accountType: "ASSET",
          isActive: true,
          deleted: false,
        }),
        findMany: jest.fn().mockResolvedValue([
          { id: "rent-1", code: "5100", isActive: true, deleted: false },
          { id: "bank-2", code: "1101", isActive: true, deleted: false },
        ]),
      },
    }

    await expect(
      assertCanSubmitPaymentVoucher(tx as never, {
        ...baseEntry,
        lines: [
          baseEntry.lines[0],
          {
            lineNo: 2,
            glAccountId: "bank-2",
            debit: new Prisma.Decimal("0"),
            credit: new Prisma.Decimal("10000"),
          },
        ],
      } as never)
    ).rejects.toMatchObject({
      code: PaymentVoucherErrorCodes.MISSING_CONTROL_ACCOUNT_LINE,
    })
  })
})
