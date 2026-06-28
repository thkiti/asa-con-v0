import { AccountingPeriodStatus, Prisma } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { postOperationalVoucher } from "@/lib/finance/posting"
import { createVoucherWithLines } from "@/lib/finance/voucher"
import { createFinanceMockTx } from "./mock-finance-tx"

function balancedLines(state: ReturnType<typeof createFinanceMockTx>["state"]) {
  const cash = state.glAccounts.find((a) => a.code === DEFAULT_ACCOUNT_CODES.CASH)!
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

describe("finance kernel refinements", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("maps duplicate voucherNo to DUPLICATE_VOUCHER_NO", async () => {
    const { tx, state } = createFinanceMockTx()
    const lines = balancedLines(state)
    const period = await tx.accountingPeriod.create({
      data: {
        branchId: "branch-1",
        periodKey: "2026-05",
        status: AccountingPeriodStatus.OPEN,
      },
    })

    const countSpy = jest.spyOn(tx.voucher, "count")
    countSpy.mockResolvedValue(0)

    await createVoucherWithLines(tx, {
      branchId: "branch-1",
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      refType: FINANCE_REF_TYPES.POS_SALE,
      refId: "sale-dup-1",
      lines,
    })

    await expect(
      createVoucherWithLines(tx, {
        branchId: "branch-1",
        periodId: period.id,
        date: new Date("2026-05-15T12:00:00.000Z"),
        refType: FINANCE_REF_TYPES.POS_SALE,
        refId: "sale-dup-2",
        lines,
      })
    ).rejects.toMatchObject({
      code: "DUPLICATE_VOUCHER_NO",
    })
  })

  it.each([
    AccountingPeriodStatus.SOFT_CLOSED,
    AccountingPeriodStatus.HARD_CLOSED,
  ])("rejects posting when period is %s without bootstrap reopen", async (status) => {
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
      postOperationalVoucher({
        tx,
        branchId: "branch-1",
        date: new Date("2026-05-10T12:00:00.000Z"),
        refType: FINANCE_REF_TYPES.POS_SALE,
        refId: "sale-closed-period",
        lines: balancedLines(state),
      })
    ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })

    expect(state.accountingPeriods).toHaveLength(1)
    expect(state.accountingPeriods[0]?.status).toBe(status)
  })


  it.each([
    AccountingPeriodStatus.SOFT_CLOSED,
    AccountingPeriodStatus.HARD_CLOSED,
  ])("createVoucherWithLines rejects %s period at voucher layer", async (status) => {
    const { tx, state } = createFinanceMockTx()
    const lines = balancedLines(state)
    state.accountingPeriods.push({
      id: "period-closed-voucher",
      branchId: "branch-1",
      periodKey: "2026-05",
      status,
      openedAt: new Date(),
      closedAt: new Date(),
    })

    await expect(
      createVoucherWithLines(tx, {
        branchId: "branch-1",
        periodId: "period-closed-voucher",
        date: new Date("2026-05-15T12:00:00.000Z"),
        refType: FINANCE_REF_TYPES.POS_SALE,
        refId: "sale-voucher-layer",
        lines,
      })
    ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })

    expect(state.vouchers).toHaveLength(0)
  })

  it("rejects PERIOD_NOT_OPENED when no period exists", async () => {
    const { tx, state } = createFinanceMockTx()

    await expect(
      postOperationalVoucher({
        tx,
        branchId: "branch-1",
        date: new Date("2026-06-01T12:00:00.000Z"),
        refType: FINANCE_REF_TYPES.POS_SALE,
        refId: "sale-no-period",
        lines: balancedLines(state),
      })
    ).rejects.toMatchObject({ code: "PERIOD_NOT_OPENED" })

    expect(state.accountingPeriods).toHaveLength(0)
  })

  it("keeps voucher lines and journal entry lines in parity after posting", async () => {
    const { tx, state } = createFinanceMockTx()

    await tx.accountingPeriod.create({
      data: {
        branchId: "branch-1",
        periodKey: "2026-05",
        status: AccountingPeriodStatus.OPEN,
      },
    })

    await postOperationalVoucher({
      tx,
      branchId: "branch-1",
      date: new Date("2026-05-20T12:00:00.000Z"),
      refType: FINANCE_REF_TYPES.STOCK_DOC_POST,
      refId: "doc-parity",
      lines: balancedLines(state),
    })

    const voucherLines = [...state.voucherLines].sort((a, b) => a.lineNo - b.lineNo)
    const journalLines = [...state.journalEntryLines].sort((a, b) => a.lineNo - b.lineNo)

    expect(voucherLines).toHaveLength(journalLines.length)
    for (let i = 0; i < voucherLines.length; i++) {
      const v = voucherLines[i]!
      const j = journalLines[i]!
      expect(v.lineNo).toBe(j.lineNo)
      expect(v.glAccountId).toBe(j.glAccountId)
      expect(v.debit.toString()).toBe(j.debit.toString())
      expect(v.credit.toString()).toBe(j.credit.toString())
      expect(v.memo).toBe(j.memo)
    }
  })
})

