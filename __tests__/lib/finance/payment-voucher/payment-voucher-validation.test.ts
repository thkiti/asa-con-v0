import { Prisma } from "@/generated/prisma/client"
import { PaymentVoucherErrorCodes } from "@/lib/finance/payment-voucher/payment-voucher-errors"
import { assertEligiblePayFromAccount } from "@/lib/finance/payment-voucher/payment-voucher-validation"

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
