import { AccountingPeriodStatus } from "@/generated/prisma/client"
import {
  assertPostingPeriodOpen,
  formatPeriodKey,
} from "@/lib/finance/posting-period"
import { createFinanceMockTx } from "./mock-finance-tx"

describe("posting-period", () => {
  describe("formatPeriodKey", () => {
    it("formats YYYY-MM from date", () => {
      expect(formatPeriodKey(new Date("2026-05-15T12:00:00.000Z"))).toBe("2026-05")
      expect(formatPeriodKey(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01")
      expect(formatPeriodKey(new Date(2026, 11, 31))).toBe("2026-12")
    })
  })

  describe("assertPostingPeriodOpen", () => {
    it("throws PERIOD_NOT_OPENED when period is missing", async () => {
      const { tx } = createFinanceMockTx()

      await expect(
        assertPostingPeriodOpen(tx, "branch-1", new Date("2026-05-10T12:00:00.000Z"))
      ).rejects.toMatchObject({ code: "PERIOD_NOT_OPENED" })
    })

    it.each([
      AccountingPeriodStatus.SOFT_CLOSED,
      AccountingPeriodStatus.HARD_CLOSED,
    ])("throws PERIOD_CLOSED when period is %s", async (status) => {
      const { tx, state } = createFinanceMockTx()
      state.accountingPeriods.push({
        id: "period-closed",
        branchId: "branch-1",
        periodKey: "2026-05",
        status,
        openedAt: new Date(),
        closedAt: new Date(),
      })

      await expect(
        assertPostingPeriodOpen(tx, "branch-1", new Date("2026-05-10T12:00:00.000Z"))
      ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })
    })

    it("returns period when OPEN", async () => {
      const { tx } = createFinanceMockTx()
      const created = await tx.accountingPeriod.create({
        data: {
          branchId: "branch-1",
          periodKey: "2026-05",
          status: AccountingPeriodStatus.OPEN,
        },
      })

      const period = await assertPostingPeriodOpen(
        tx,
        "branch-1",
        new Date("2026-05-10T12:00:00.000Z")
      )

      expect(period.id).toBe(created.id)
      expect(period.status).toBe(AccountingPeriodStatus.OPEN)
    })
  })
})
