import { trialBalanceToCsv } from "@/lib/finance-ui/trial-balance"
import type { TrialBalanceResult } from "@/lib/finance-ui/types"

describe("trialBalanceToCsv", () => {
  it("emits body rows in the same accountCode order as the result", () => {
    const result: TrialBalanceResult = {
      filter: { legalEntityCode: "AS", periodKey: "2026-01" },
      rows: [
        {
          accountCode: "1000",
          accountName: "Inventory",
          accountType: "ASSET",
          totalDebit: "100",
          totalCredit: "0",
          signedBalance: "100",
        },
        {
          accountCode: "2100",
          accountName: "AP",
          accountType: "LIABILITY",
          totalDebit: "0",
          totalCredit: "40",
          signedBalance: "40",
        },
        {
          accountCode: "5000",
          accountName: "COGS",
          accountType: "EXPENSE",
          totalDebit: "20",
          totalCredit: "0",
          signedBalance: "20",
        },
        {
          accountCode: "5001",
          accountName: "Sales",
          accountType: "REVENUE",
          totalDebit: "0",
          totalCredit: "80",
          signedBalance: "80",
        },
      ],
      totalDebits: "120",
      totalCredits: "120",
      difference: "0",
      isBalanced: true,
    }

    const csv = trialBalanceToCsv(result)
    const bodyLines = csv
      .split("\n")
      .slice(1)
      .filter((line) => line && !line.startsWith('"TOTAL"') && !line.includes('"Status"'))

    expect(bodyLines.map((line) => line.match(/^"([^"]+)"/)?.[1])).toEqual([
      "1000 • Inventory",
      "2100 • AP",
      "5000 • COGS",
      "5001 • Sales",
    ])
    expect(csv).toContain('"120","120","0"')
  })
})
