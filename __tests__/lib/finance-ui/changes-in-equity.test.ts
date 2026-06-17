import { changesInEquityToCsv } from "@/lib/finance-ui/changes-in-equity"

describe("changesInEquityToCsv", () => {
  it("serializes matrix rows and metadata", () => {
    const csv = changesInEquityToCsv({
      filter: { legalEntityCode: "AS", branchId: "branch-1", periodKey: "2026-05" },
      period: { legalEntityCode: "AS", periodKey: "2026-05" },
      columns: [
        { accountCode: "301", accountName: "Retained Earnings" },
        { accountCode: "1", accountName: "Share capital" },
      ],
      rows: [
        {
          rowKey: "OPENING",
          label: "Opening balance",
          amounts: { "301": "100000", "1": "200000" },
          total: "300000",
        },
        {
          rowKey: "PROFIT_FOR_PERIOD",
          label: "Profit for period",
          amounts: { "301": "400", "1": "0" },
          total: "400",
        },
        {
          rowKey: "OTHER_CHANGES",
          label: "Other changes",
          amounts: { "301": "-30000", "1": "30000" },
          total: "0",
        },
        {
          rowKey: "CLOSING",
          label: "Closing balance",
          amounts: { "301": "70400", "1": "230000" },
          total: "300400",
        },
        {
          rowKey: "RECONCILIATION_CHECK",
          label: "Reconciliation check",
          amounts: { "301": "0", "1": "0" },
          total: "0",
        },
      ],
      profitForPeriod: "400",
      profitSource: "CLOSING_ENTRY",
      retainedEarningsAccountCode: "301",
      activeClosingEntry: {
        voucherId: "voucher-1",
        voucherNo: "V-CE-2026-05",
        journalEntryId: "journal-1",
        netIncome: "400",
        postedAt: "2026-05-31T12:00:00.000Z",
      },
      reconciliation: {
        isBalanced: true,
        columnDifferences: { "301": "0", "1": "0" },
        totalDifference: "0",
      },
      warnings: [],
    })

    expect(csv).toContain("Opening balance")
    expect(csv).toContain("301 • Retained Earnings")
    expect(csv).toContain("Closing entry (posted)")
    expect(csv).toContain("Balanced")
  })
})
