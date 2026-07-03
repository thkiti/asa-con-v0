import { computeBankReconciliationAmounts, computeCashReconciliationVariance } from "@/lib/finance/period-reconciliation-compute"

describe("computeBankReconciliationAmounts", () => {
  it("computes reconciled balance and zero variance when balanced", () => {
    const result = computeBankReconciliationAmounts({
      glBalance: "10000.00",
      bankStatementBalance: "10150.00",
      outstandingDeposits: "200.00",
      outstandingPayments: "100.00",
      interest: "30.00",
      bankCharges: "20.00",
      adjustments: "40.00",
    })

    expect(result.reconciledBalance).toBe("10150.00")
    expect(result.variance).toBe("0.00")
  })

  it("reports non-zero variance when statement differs", () => {
    const result = computeBankReconciliationAmounts({
      glBalance: "500.00",
      bankStatementBalance: "400.00",
    })

    expect(result.reconciledBalance).toBe("500.00")
    expect(result.variance).toBe("100.00")
  })
})

describe("computeCashReconciliationVariance", () => {
  it("computes counted minus expected", () => {
    const result = computeCashReconciliationVariance({
      expectedCash: "1200.00",
      actualCountedCash: "1180.50",
    })

    expect(result.variance).toBe("-19.50")
  })
})
