import { BankAccountError } from "@/lib/finance/bank-account"
import { updateBankAccount } from "@/lib/finance/bank-account/bank-account-save"

jest.mock("@/lib/finance/bank-account/bank-account-read", () => ({
  getBankAccountById: jest.fn(),
}))

import { getBankAccountById as mockGetById } from "@/lib/finance/bank-account/bank-account-read"

const mockGet = mockGetById as jest.Mock

describe("updateBankAccount", () => {
  const existingRow = {
    id: "bank-1",
    legalEntityCode: "AD",
    bankName: "BBL",
    accountNumber: "2193020266",
    accountName: "Current",
    currencyCode: "THB",
    glAccountId: "gl-1",
    isActive: true,
  }

  it("updates fields and returns mapped row", async () => {
    const prisma = {
      bankAccount: {
        findFirst: jest.fn().mockResolvedValue(existingRow),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(existingRow),
      },
      glAccount: {
        findFirst: jest.fn().mockResolvedValue({ id: "gl-2" }),
      },
    }

    mockGet.mockResolvedValue({
      id: "bank-1",
      legalEntityCode: "AD",
      bankName: "Bangkok Bank",
      accountNumber: "2193020266",
      accountName: "Current AD",
      currencyCode: "THB",
      glAccount: { id: "gl-2", code: "1021", name: "Bank" },
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    })

    const result = await updateBankAccount(prisma, {
      id: "bank-1",
      legalEntityCode: "AD",
      bankName: "Bangkok Bank",
      accountName: "Current AD",
      glAccountCode: "1021",
    })

    expect(prisma.bankAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "bank-1" },
        data: expect.objectContaining({
          bankName: "Bangkok Bank",
          accountName: "Current AD",
          glAccountId: "gl-2",
        }),
      })
    )
    expect(result.bankName).toBe("Bangkok Bank")
  })

  it("rejects cross-entity update when account not found", async () => {
    const prisma = {
      bankAccount: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      glAccount: {
        findFirst: jest.fn(),
      },
    }

    await expect(
      updateBankAccount(prisma, {
        id: "bank-ad",
        legalEntityCode: "AS",
        bankName: "BBL",
      })
    ).rejects.toBeInstanceOf(BankAccountError)
  })
})
