import { AccountingPeriodStatus, GlAccountType, Prisma, VoucherStatus } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { toMoney } from "@/lib/finance/decimal"
import { PENDING_CASH_FLOW_MAPPINGS } from "@/lib/finance/reports/cash-flow-mapping"
import { getCashFlow } from "@/lib/finance/reports/cash-flow"
import { createFinanceMockTx } from "../mock-finance-tx"

const d = (n: string) => new Prisma.Decimal(n)

function seedJournal(
  state: ReturnType<typeof createFinanceMockTx>["state"],
  input: {
    id: string
    branchId: string
    periodId: string
    date: Date
    lines: { code: string; debit: string; credit: string }[]
  }
) {
  const voucherId = `voucher-${input.id}`
  state.vouchers.push({
    id: voucherId,
    voucherNo: `V-${input.id}`,
    date: input.date,
    status: VoucherStatus.POSTED,
    branchId: input.branchId,
    periodId: input.periodId,
    refType: "MANUAL_JOURNAL",
    refId: input.id,
    refNo: null,
    description: null,
    postedAt: input.date,
    createdAt: input.date,
  })

  state.journalEntries.push({
    id: input.id,
    voucherId,
    date: input.date,
    branchId: input.branchId,
    periodId: input.periodId,
    postedAt: input.date,
    createdAt: input.date,
    reversalOfJournalEntryId: null,
  })

  let lineNo = 1
  for (const line of input.lines) {
    const account = state.glAccounts.find((a) => a.code === line.code)
    if (!account) throw new Error(`missing account ${line.code}`)
    state.journalEntryLines.push({
      id: `jline-${input.id}-${lineNo}`,
      journalEntryId: input.id,
      lineNo,
      glAccountId: account.id,
      debit: d(line.debit),
      credit: d(line.credit),
      memo: null,
    })
    lineNo += 1
  }
}

async function seedPeriod(
  tx: ReturnType<typeof createFinanceMockTx>["tx"],
  branchId: string,
  periodKey: string
) {
  return tx.accountingPeriod.create({
    data: {
      branchId,
      periodKey,
      status: AccountingPeriodStatus.OPEN,
    },
  })
}

describe("getCashFlow", () => {
  const branchId = "branch-1"
  const periodKey = "2026-05"

  it("returns empty result for unknown period", async () => {
    const { tx } = createFinanceMockTx(branchId)

    const result = await getCashFlow(tx, { branchId, periodKey: "2099-01" })

    expect(result.netChangeInCash).toBe("0")
    expect(result.sections.operating.lines).toHaveLength(0)
    expect(result.cashReconciliation.isReconciled).toBe(true)
  })

  it("includes pending mapping warnings for all documented categories", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    await seedPeriod(tx, branchId, periodKey)

    const result = await getCashFlow(tx, { branchId, periodKey })

    const pendingWarnings = result.warnings.filter((w) => w.code === "PENDING_MAPPING")
    expect(pendingWarnings).toHaveLength(PENDING_CASH_FLOW_MAPPINGS.length)
  })

  it("reconciles simple cash sale through operating activities", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, periodKey)

    seedJournal(state, {
      id: "sale-1",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "1000", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "1000" },
      ],
    })

    const result = await getCashFlow(tx, { branchId, periodKey })

    expect(result.netIncome).toBe("1000")
    expect(result.netChangeInCash).toBe("1000")
    expect(result.cashReconciliation.glChange).toBe("1000")
    expect(result.cashReconciliation.isReconciled).toBe(true)
    expect(result.sections.operating.lines[0]).toMatchObject({
      key: "NET_INCOME",
      amount: "1000",
    })
  })

  it("includes working capital adjustments for inventory and AP", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, periodKey)

    seedJournal(state, {
      id: "sale-1",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-10T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "1000", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "0", credit: "1000" },
      ],
    })
    seedJournal(state, {
      id: "purchase-1",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-12T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.INVENTORY, debit: "500", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.AP, debit: "0", credit: "500" },
      ],
    })

    const result = await getCashFlow(tx, { branchId, periodKey })

    const inventoryLine = result.sections.operating.lines.find((line) =>
      line.key.startsWith("WC_ASSET_")
    )
    const apLine = result.sections.operating.lines.find((line) =>
      line.key.startsWith("WC_LIABILITY_")
    )

    expect(inventoryLine?.amount).toBe("-500")
    expect(apLine?.amount).toBe("500")
    expect(result.netChangeInCash).toBe("1000")
    expect(result.cashReconciliation.isReconciled).toBe(true)
  })

  it("warns for unmapped accounts with activity in scope", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, periodKey)

    state.glAccounts.push({
      id: "gl-prepaid",
      code: "1200",
      name: "Prepaid expense",
      accountType: GlAccountType.ASSET,
      isActive: true,
      deleted: false,
    })

    seedJournal(state, {
      id: "prepaid-1",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: "1200", debit: "200", credit: "0" },
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "0", credit: "200" },
      ],
    })

    const result = await getCashFlow(tx, { branchId, periodKey })

    expect(
      result.warnings.some(
        (warning) =>
          warning.code === "UNMAPPED_ACCOUNT_WITH_ACTIVITY" &&
          warning.message.includes("1200")
      )
    ).toBe(true)
  })

  it("maps financing from equity other changes", async () => {
    const { tx, state } = createFinanceMockTx(branchId)
    const period = await seedPeriod(tx, branchId, periodKey)

    if (!state.glAccounts.some((account) => account.code === "1")) {
      state.glAccounts.push({
        id: "gl-share-capital",
        code: "1",
        name: "Share capital",
        accountType: GlAccountType.EQUITY,
        isActive: true,
        deleted: false,
      })
    }

    seedJournal(state, {
      id: "capital-1",
      branchId,
      periodId: period.id,
      date: new Date("2026-05-15T12:00:00.000Z"),
      lines: [
        { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "5000", credit: "0" },
        { code: "1", debit: "0", credit: "5000" },
      ],
    })

    const result = await getCashFlow(tx, { branchId, periodKey })

    expect(toMoney(result.sections.financing.subtotal).gt(0)).toBe(true)
    expect(result.cashReconciliation.isReconciled).toBe(true)
    expect(result.netChangeInCash).toBe("5000")
  })
})
