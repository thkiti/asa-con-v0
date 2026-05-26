import { AccountingPeriodStatus, Prisma } from "@/generated/prisma/client"
import {
  closeAccountingPeriod,
  reopenAccountingPeriod,
} from "@/lib/finance/period-close"
import { postOperationalVoucher } from "@/lib/finance/posting"
import { assertPostingPeriodOpen } from "@/lib/finance/posting-period"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { createFinanceMockTx } from "./mock-finance-tx"

const branchId = "branch-1"
const periodKey = "2026-05"
const postingDate = new Date("2026-05-15T12:00:00.000Z")

async function seedOpenPeriod(
  tx: ReturnType<typeof createFinanceMockTx>["tx"],
  bId: string,
  pKey: string
) {
  return tx.accountingPeriod.create({
    data: { branchId: bId, periodKey: pKey, status: AccountingPeriodStatus.OPEN },
  })
}

function balancedLines(state: ReturnType<typeof createFinanceMockTx>["state"]) {
  const cash = state.glAccounts.find((a) => a.code === "1100")!
  const revenue = state.glAccounts.find((a) => a.code === "4000")!
  return [
    {
      glAccountId: cash.id,
      debit: new Prisma.Decimal("25"),
      credit: new Prisma.Decimal("0"),
    },
    {
      glAccountId: revenue.id,
      debit: new Prisma.Decimal("0"),
      credit: new Prisma.Decimal("25"),
    },
  ]
}

describe("period-close", () => {
  it("closes OPEN period to SOFT_CLOSED with closedAt set", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)

    const closed = await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "SOFT",
    })

    expect(closed.status).toBe(AccountingPeriodStatus.SOFT_CLOSED)
    expect(closed.closedAt).toBeInstanceOf(Date)
    expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.SOFT_CLOSED)
    expect(state.accountingPeriods[0]?.closedAt).toBeInstanceOf(Date)
  })

  it("closes OPEN period to HARD_CLOSED", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)

    const closed = await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "HARD",
    })

    expect(closed.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
    expect(closed.closedAt).toBeInstanceOf(Date)
    expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
  })

  it("closes SOFT_CLOSED period to HARD_CLOSED", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    await closeAccountingPeriod(tx, { branchId, periodKey, mode: "SOFT" })

    const closed = await closeAccountingPeriod(tx, {
      branchId,
      periodKey,
      mode: "HARD",
    })

    expect(closed.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
    expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
  })

  it("reopens SOFT_CLOSED period to OPEN with closedAt null", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    await closeAccountingPeriod(tx, { branchId, periodKey, mode: "SOFT" })

    const reopened = await reopenAccountingPeriod(tx, { branchId, periodKey })

    expect(reopened.status).toBe(AccountingPeriodStatus.OPEN)
    expect(reopened.closedAt).toBeNull()
    expect(state.accountingPeriods[0]?.status).toBe(AccountingPeriodStatus.OPEN)
    expect(state.accountingPeriods[0]?.closedAt).toBeNull()
  })

  it("rejects reopen when HARD_CLOSED with PERIOD_ALREADY_HARD_CLOSED", async () => {
    const { tx } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    await closeAccountingPeriod(tx, { branchId, periodKey, mode: "HARD" })

    await expect(reopenAccountingPeriod(tx, { branchId, periodKey })).rejects.toMatchObject({
      code: "PERIOD_ALREADY_HARD_CLOSED",
    })
  })

  it("throws PERIOD_NOT_FOUND when period is missing", async () => {
    const { tx } = createFinanceMockTx()

    await expect(
      closeAccountingPeriod(tx, { branchId, periodKey, mode: "SOFT" })
    ).rejects.toMatchObject({ code: "PERIOD_NOT_FOUND" })

    await expect(reopenAccountingPeriod(tx, { branchId, periodKey })).rejects.toMatchObject({
      code: "PERIOD_NOT_FOUND",
    })
  })

  it("is idempotent on SOFT close when already SOFT_CLOSED", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    const first = await closeAccountingPeriod(tx, { branchId, periodKey, mode: "SOFT" })

    const second = await closeAccountingPeriod(tx, { branchId, periodKey, mode: "SOFT" })

    expect(second.id).toBe(first.id)
    expect(second.status).toBe(AccountingPeriodStatus.SOFT_CLOSED)
    expect(state.accountingPeriods).toHaveLength(1)
  })

  it("is idempotent on HARD close when already HARD_CLOSED", async () => {
    const { tx, state } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    const first = await closeAccountingPeriod(tx, { branchId, periodKey, mode: "HARD" })

    const second = await closeAccountingPeriod(tx, { branchId, periodKey, mode: "HARD" })

    expect(second.id).toBe(first.id)
    expect(second.status).toBe(AccountingPeriodStatus.HARD_CLOSED)
    expect(state.accountingPeriods).toHaveLength(1)
  })

  it("is idempotent on reopen when already OPEN", async () => {
    const { tx, state } = createFinanceMockTx()
    const created = await seedOpenPeriod(tx, branchId, periodKey)

    const reopened = await reopenAccountingPeriod(tx, { branchId, periodKey })

    expect(reopened.id).toBe(created.id)
    expect(reopened.status).toBe(AccountingPeriodStatus.OPEN)
    expect(state.accountingPeriods).toHaveLength(1)
  })

  it("rejects SOFT close when HARD_CLOSED with PERIOD_ALREADY_HARD_CLOSED", async () => {
    const { tx } = createFinanceMockTx()
    await seedOpenPeriod(tx, branchId, periodKey)
    await closeAccountingPeriod(tx, { branchId, periodKey, mode: "HARD" })

    await expect(
      closeAccountingPeriod(tx, { branchId, periodKey, mode: "SOFT" })
    ).rejects.toMatchObject({ code: "PERIOD_ALREADY_HARD_CLOSED" })
  })

  describe("posting integration", () => {
    it("assertPostingPeriodOpen succeeds when period is OPEN", async () => {
      const { tx } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)

      const period = await assertPostingPeriodOpen(tx, branchId, postingDate)

      expect(period.status).toBe(AccountingPeriodStatus.OPEN)
    })

    it.each([
      ["SOFT", "SOFT" as const],
      ["HARD", "HARD" as const],
    ])(
      "assertPostingPeriodOpen throws PERIOD_CLOSED after %s close",
      async (_label, mode) => {
        const { tx } = createFinanceMockTx()
        await seedOpenPeriod(tx, branchId, periodKey)
        await closeAccountingPeriod(tx, { branchId, periodKey, mode })

        await expect(
          assertPostingPeriodOpen(tx, branchId, postingDate)
        ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })
      }
    )

    it("postOperationalVoucher succeeds on OPEN period", async () => {
      const { tx, state } = createFinanceMockTx()
      await seedOpenPeriod(tx, branchId, periodKey)

      await expect(
        postOperationalVoucher({
          tx,
          branchId,
          date: postingDate,
          refType: FINANCE_REF_TYPES.POS_SALE,
          refId: "period-close-open",
          lines: balancedLines(state),
        })
      ).resolves.toMatchObject({ alreadyPosted: false })

      expect(state.vouchers).toHaveLength(1)
    })

    it.each([
      ["SOFT", "SOFT" as const],
      ["HARD", "HARD" as const],
    ])(
      "postOperationalVoucher throws PERIOD_CLOSED after %s close",
      async (_label, mode) => {
        const { tx, state } = createFinanceMockTx()
        await seedOpenPeriod(tx, branchId, periodKey)
        await closeAccountingPeriod(tx, { branchId, periodKey, mode })

        await expect(
          postOperationalVoucher({
            tx,
            branchId,
            date: postingDate,
            refType: FINANCE_REF_TYPES.POS_SALE,
            refId: `period-close-${mode.toLowerCase()}`,
            lines: balancedLines(state),
          })
        ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })

        expect(state.vouchers).toHaveLength(0)
      }
    )
  })
})
