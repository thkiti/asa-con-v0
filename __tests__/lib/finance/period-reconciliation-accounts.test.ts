import { GlAccountReconciliationRole } from "@/generated/prisma/client"
import {
  listBankReconciliationAccounts,
  listCashReconciliationAccounts,
  requireReconciliationGlAccount,
} from "@/lib/finance/period-reconciliation-accounts"

describe("period-reconciliation-accounts", () => {
  it("lists bank accounts linked by active BankAccount rows for the legal entity", async () => {
    const prisma = {
      bankAccount: {
        findMany: jest.fn(async () => [
          {
            glAccount: { id: "bank-2", code: "1021002", name: "Bangkok Bank Current" },
          },
          {
            glAccount: { id: "bank-3", code: "1021003", name: "Bangkok Bank Savings" },
          },
        ]),
      },
      glAccount: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    }

    const accounts = await listBankReconciliationAccounts(prisma, "AS")

    expect(prisma.bankAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          legalEntityCode: "AS",
          isActive: true,
          glAccount: expect.objectContaining({
            reconciliationRole: GlAccountReconciliationRole.BANK,
          }),
        }),
      })
    )
    expect(accounts).toEqual([
      { id: "bank-2", code: "1021002", name: "Bangkok Bank Current" },
      { id: "bank-3", code: "1021003", name: "Bangkok Bank Savings" },
    ])
  })

  it("scopes AD bank reconciliation to AD-linked GL accounts only", async () => {
    const prisma = {
      bankAccount: {
        findMany: jest.fn(async () => [
          {
            glAccount: { id: "bank-1", code: "1021001", name: "Bangkok Bank AD" },
          },
        ]),
      },
      glAccount: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    }

    const accounts = await listBankReconciliationAccounts(prisma, "AD")

    expect(prisma.bankAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ legalEntityCode: "AD" }),
      })
    )
    expect(accounts).toEqual([
      { id: "bank-1", code: "1021001", name: "Bangkok Bank AD" },
    ])
  })

  it("lists cash accounts by reconciliation role", async () => {
    const prisma = {
      bankAccount: {
        findMany: jest.fn(),
      },
      glAccount: {
        findMany: jest.fn(async () => [
          { id: "cash-1", code: "1001", name: "Cash drawer" },
        ]),
        findFirst: jest.fn(),
      },
    }

    const accounts = await listCashReconciliationAccounts(prisma, "AS")

    expect(prisma.glAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          reconciliationRole: GlAccountReconciliationRole.CASH,
        }),
      })
    )
    expect(accounts).toEqual([{ id: "cash-1", code: "1001", name: "Cash drawer" }])
  })

  it("rejects GL accounts without the expected reconciliation role", async () => {
    const prisma = {
      bankAccount: {
        findMany: jest.fn(),
      },
      glAccount: {
        findFirst: jest.fn(async () => ({
          id: "acc-1",
          code: "4000",
          name: "Revenue",
          reconciliationRole: GlAccountReconciliationRole.NONE,
        })),
        findMany: jest.fn(),
      },
    }

    await expect(
      requireReconciliationGlAccount(prisma, {
        glAccountCode: "4000",
        expectedRole: GlAccountReconciliationRole.BANK,
      })
    ).rejects.toThrow("not configured for bank reconciliation")
  })
})
