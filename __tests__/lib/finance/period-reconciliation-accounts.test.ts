import { GlAccountReconciliationRole } from "@/generated/prisma/client"
import {
  listBankReconciliationAccounts,
  listCashReconciliationAccounts,
  requireReconciliationGlAccount,
} from "@/lib/finance/period-reconciliation-accounts"

describe("period-reconciliation-accounts", () => {
  it("lists bank accounts by reconciliation role", async () => {
    const prisma = {
      glAccount: {
        findMany: jest.fn(async () => [
          { id: "bank-1", code: "1021001", name: "Bangkok Bank" },
        ]),
      },
    }

    const accounts = await listBankReconciliationAccounts(prisma, "AS")

    expect(prisma.glAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          reconciliationRole: GlAccountReconciliationRole.BANK,
        }),
      })
    )
    expect(accounts).toEqual([
      { id: "bank-1", code: "1021001", name: "Bangkok Bank" },
    ])
  })

  it("lists cash accounts by reconciliation role", async () => {
    const prisma = {
      glAccount: {
        findMany: jest.fn(async () => [
          { id: "cash-1", code: "1001", name: "Cash drawer" },
        ]),
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
      glAccount: {
        findFirst: jest.fn(async () => ({
          id: "acc-1",
          code: "4000",
          name: "Revenue",
          reconciliationRole: GlAccountReconciliationRole.NONE,
        })),
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
