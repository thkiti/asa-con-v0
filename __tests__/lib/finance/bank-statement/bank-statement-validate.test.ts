import { validateBankStatementBalances } from "@/lib/finance/bank-statement"

describe("validateBankStatementBalances", () => {
  it("passes when opening + deposits - withdrawals = closing", () => {
    const result = validateBankStatementBalances({
      openingBalance: "908539.12",
      closingBalance: "638317.53",
      lines: [
        { depositAmount: "220289.49", withdrawalAmount: null },
        { depositAmount: null, withdrawalAmount: "490511.08" },
      ],
    })

    expect(result.isValid).toBe(true)
    expect(result.totalDeposits).toBe("220289.49")
    expect(result.totalWithdrawals).toBe("490511.08")
    expect(result.computedClosingBalance).toBe("638317.53")
  })

  it("fails when declared closing does not match computed closing", () => {
    const result = validateBankStatementBalances({
      openingBalance: "100.00",
      closingBalance: "150.00",
      lines: [{ depositAmount: "20.00", withdrawalAmount: null }],
    })

    expect(result.isValid).toBe(false)
    expect(result.computedClosingBalance).toBe("120.00")
    expect(result.declaredClosingBalance).toBe("150.00")
  })

  it("handles empty lines", () => {
    const result = validateBankStatementBalances({
      openingBalance: "500.00",
      closingBalance: "500.00",
      lines: [],
    })

    expect(result.isValid).toBe(true)
  })
})
