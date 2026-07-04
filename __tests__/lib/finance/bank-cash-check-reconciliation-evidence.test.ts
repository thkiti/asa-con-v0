import {
  buildBankCashCheckReconciliationEvidence,
  resolveBankCashCheckReconciliationStatus,
} from "@/lib/finance/bank-cash-check"

describe("buildBankCashCheckReconciliationEvidence", () => {
  it("marks January 2026 AD bank cash check as complete when READY and variance is zero", () => {
    const evidence = buildBankCashCheckReconciliationEvidence({
      glAccountId: "gl-bbl",
      glAccountCode: "1021002",
      bankAccountId: "bank-bbl",
      bankAccountLabel: "Bangkok Bank 2193020266",
      statementId: "stmt-1",
      statementNo: "BS-2026-01-001",
      statementStatus: "READY",
      statementEndingBalance: "638317.53",
      bookEndingBalance: "638317.53",
      outstandingDeposits: "0.00",
      outstandingCheques: "0.00",
    })

    expect(evidence.variance).toBe("0.00")
    expect(evidence.status).toBe("COMPLETE")
    expect(evidence.complete).toBe(true)
  })

  it("computes worksheet variance from book balance and outstanding items", () => {
    const evidence = buildBankCashCheckReconciliationEvidence({
      glAccountId: "gl-bbl",
      glAccountCode: "1021002",
      bankAccountId: "bank-bbl",
      bankAccountLabel: "Bangkok Bank 2193020266",
      statementId: "stmt-1",
      statementNo: "BS-2026-01-001",
      statementStatus: "READY",
      statementEndingBalance: "638317.53",
      bookEndingBalance: "638000.00",
      outstandingDeposits: "317.53",
      outstandingCheques: "0.00",
    })

    expect(evidence.variance).toBe("0.00")
    expect(evidence.status).toBe("COMPLETE")
  })

  it("flags variance when READY but balances do not reconcile", () => {
    const evidence = buildBankCashCheckReconciliationEvidence({
      glAccountId: "gl-bbl",
      glAccountCode: "1021002",
      bankAccountId: "bank-bbl",
      bankAccountLabel: "Bangkok Bank 2193020266",
      statementId: "stmt-1",
      statementNo: "BS-2026-01-001",
      statementStatus: "READY",
      statementEndingBalance: "638317.53",
      bookEndingBalance: "638000.00",
      outstandingDeposits: "0.00",
      outstandingCheques: "0.00",
    })

    expect(evidence.variance).toBe("-317.53")
    expect(evidence.status).toBe("VARIANCE")
    expect(evidence.complete).toBe(false)
  })

  it("treats DRAFT statement as in progress", () => {
    const status = resolveBankCashCheckReconciliationStatus({
      hasStatement: true,
      statementStatus: "DRAFT",
      variance: "0.00",
    })

    expect(status).toBe("IN_PROGRESS")
  })
})
