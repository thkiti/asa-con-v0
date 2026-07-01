import type { GeneralLedgerAccount, GeneralLedgerTransaction } from "@/lib/finance-ui/types"
import {
  generalLedgerTAccountTotals,
  splitGeneralLedgerTAccountRows,
  sumGeneralLedgerTransactionCredits,
  sumGeneralLedgerTransactionDebits,
} from "@/lib/finance-ui/general-ledger-t-account"

function tx(
  overrides: Partial<GeneralLedgerTransaction> & Pick<GeneralLedgerTransaction, "journalLineId">
): GeneralLedgerTransaction {
  return {
    journalEntryId: "je-1",
    journalDate: "2025-12-31T00:00:00.000Z",
    entryNo: "MJV-260001",
    sourceRef: null,
    sourceRefType: null,
    sourceRefId: null,
    voucherId: null,
    description: "Opening balance entry",
    lineMemo: null,
    debit: "0",
    credit: "0",
    signedMovement: "0",
    runningBalance: "0",
    ...overrides,
  }
}

const sampleAccount: GeneralLedgerAccount = {
  accountCode: "1",
  accountName: "ทุนหุ้นสามัญ",
  accountType: "EQUITY",
  openingDebit: "0",
  openingCredit: "0",
  openingBalance: "0",
  closingBalance: "1950000.00",
  transactions: [
    tx({
      journalLineId: "jl-credit",
      credit: "2000000.00",
      debit: "0",
      signedMovement: "-2000000",
      runningBalance: "2000000.00",
    }),
    tx({
      journalLineId: "jl-debit",
      journalEntryId: "je-2",
      entryNo: "MJV-260002",
      description: "Capital reduction",
      debit: "50000.00",
      credit: "0",
      signedMovement: "50000",
      runningBalance: "1950000.00",
    }),
  ],
}

describe("general-ledger-t-account", () => {
  it("splits debit and credit rows for T-account sides", () => {
    const split = splitGeneralLedgerTAccountRows(sampleAccount.transactions)

    expect(split.debitRows).toHaveLength(1)
    expect(split.creditRows).toHaveLength(1)
    expect(split.debitRows[0]).toMatchObject({
      journalLineId: "jl-debit",
      amount: "50000.00",
    })
    expect(split.creditRows[0]).toMatchObject({
      journalLineId: "jl-credit",
      amount: "2000000.00",
    })
  })

  it("keeps opening and closing balances from the GL account", () => {
    const totals = generalLedgerTAccountTotals(sampleAccount)

    expect(totals.openingBalance).toBe("0")
    expect(totals.closingBalance).toBe("1950000.00")
    expect(sumGeneralLedgerTransactionDebits(sampleAccount.transactions)).toBe(50000)
    expect(sumGeneralLedgerTransactionCredits(sampleAccount.transactions)).toBe(2000000)
    expect(totals.totalDebit).toBe(50000)
    expect(totals.totalCredit).toBe(2000000)
  })

  it("returns empty sides when there are no period transactions", () => {
    const emptyAccount: GeneralLedgerAccount = {
      ...sampleAccount,
      transactions: [],
      closingBalance: "100.00",
      openingBalance: "100.00",
    }

    const split = splitGeneralLedgerTAccountRows(emptyAccount.transactions)
    const totals = generalLedgerTAccountTotals(emptyAccount)

    expect(split.debitRows).toEqual([])
    expect(split.creditRows).toEqual([])
    expect(totals.openingBalance).toBe("100.00")
    expect(totals.closingBalance).toBe("100.00")
    expect(totals.totalDebit).toBe(0)
    expect(totals.totalCredit).toBe(0)
  })
})
