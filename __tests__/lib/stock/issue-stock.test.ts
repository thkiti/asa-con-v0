import { applyIssueItem } from "@/lib/stock/issue-stock"
import { StockLedgerError } from "@/lib/stock/stock-errors"

describe("applyIssueItem (retired)", () => {
  it("throws PER_EVENT_LEDGER_RETIRED without mutating stock", async () => {
    await expect(
      applyIssueItem(
        {} as never,
        {
          branchId: "branch-1",
          refType: "POS_SALE",
          refId: "sale-1",
          documentId: null,
          date: new Date("2026-01-15"),
        },
        { productId: "product-1", qty: 2 }
      )
    ).rejects.toMatchObject({
      code: "PER_EVENT_LEDGER_RETIRED",
      name: "StockLedgerError",
    })
    await expect(
      applyIssueItem(
        {} as never,
        {
          branchId: "b",
          refType: "X",
          refId: "r",
          documentId: null,
          date: new Date(),
        },
        { productId: "p", qty: 1 }
      )
    ).rejects.toBeInstanceOf(StockLedgerError)
  })
})
