import { Prisma } from "@/generated/prisma/client"
import { GlAccountType } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { getGlAccountBalance } from "@/lib/finance/gl-balance"
import { createFinanceMockTx } from "./mock-finance-tx"

const d = (n: string) => new Prisma.Decimal(n)

function seedJournal(
  state: ReturnType<typeof createFinanceMockTx>["state"],
  branchId: string,
  lines: { code: string; debit: string; credit: string }[]
) {
  const entryId = "journal-test-1"
  state.journalEntries.push({
    id: entryId,
    voucherId: "voucher-test-1",
    date: new Date("2026-05-15T12:00:00.000Z"),
    branchId,
    periodId: "period-1",
    postedAt: new Date(),
    createdAt: new Date(),
  })

  let lineNo = 1
  for (const line of lines) {
    const account = state.glAccounts.find((a) => a.code === line.code)
    if (!account) throw new Error(`missing account ${line.code}`)
    state.journalEntryLines.push({
      id: `jline-${lineNo}`,
      journalEntryId: entryId,
      lineNo,
      glAccountId: account.id,
      debit: d(line.debit),
      credit: d(line.credit),
      memo: null,
    })
    lineNo += 1
  }
}

describe("getGlAccountBalance", () => {
  it("returns debit-normal balance for asset accounts", async () => {
    const { tx, state, branchId } = createFinanceMockTx()
    seedJournal(state, branchId, [
      { code: DEFAULT_ACCOUNT_CODES.INVENTORY, debit: "1000", credit: "0" },
      { code: DEFAULT_ACCOUNT_CODES.INVENTORY, debit: "0", credit: "200" },
    ])

    const result = await getGlAccountBalance(tx, {
      accountCodes: [DEFAULT_ACCOUNT_CODES.INVENTORY],
      branchId,
    })

    expect(result.accounts[0]).toMatchObject({
      accountCode: DEFAULT_ACCOUNT_CODES.INVENTORY,
      accountType: GlAccountType.ASSET,
      debitTotal: "1000",
      creditTotal: "200",
      balance: "800",
    })
  })

  it("returns credit-normal balance for revenue accounts", async () => {
    const { tx, state, branchId } = createFinanceMockTx()
    seedJournal(state, branchId, [
      { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: "50", credit: "500" },
    ])

    const result = await getGlAccountBalance(tx, {
      accountCodes: [DEFAULT_ACCOUNT_CODES.REVENUE],
      branchId,
    })

    expect(result.accounts[0]).toMatchObject({
      accountCode: DEFAULT_ACCOUNT_CODES.REVENUE,
      accountType: GlAccountType.REVENUE,
      debitTotal: "50",
      creditTotal: "500",
      balance: "450",
    })
  })

  it("filters by journal entry date range", async () => {
    const { tx, state, branchId } = createFinanceMockTx()
    seedJournal(state, branchId, [
      { code: DEFAULT_ACCOUNT_CODES.CASH, debit: "100", credit: "0" },
    ])
    state.journalEntries[0]!.date = new Date("2026-04-01T00:00:00.000Z")

    const inRange = await getGlAccountBalance(tx, {
      accountCodes: [DEFAULT_ACCOUNT_CODES.CASH],
      branchId,
      from: "2026-05-01",
      to: "2026-05-31",
    })
    expect(inRange.accounts[0]?.balance).toBe("0")

    const all = await getGlAccountBalance(tx, {
      accountCodes: [DEFAULT_ACCOUNT_CODES.CASH],
      branchId,
    })
    expect(all.accounts[0]?.balance).toBe("100")
  })
})
