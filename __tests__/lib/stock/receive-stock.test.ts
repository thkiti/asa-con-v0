import { applyReceiveItem } from "@/lib/stock/receive-stock"
import { StockLedgerError } from "@/lib/stock/stock-errors"

describe("applyReceiveItem (retired)", () => {
  it("throws PER_EVENT_LEDGER_RETIRED without mutating stock", async () => {
    await expect(
      applyReceiveItem(
        {} as never,
        {
          branchId: "branch-1",
          refType: "STOCK_DOC_PURCHASE",
          refId: "doc-1",
          documentId: "doc-1",
          date: new Date("2026-01-15"),
        },
        { productId: "product-1", qty: 2, unitCost: 10 }
      )
    ).rejects.toMatchObject({
      code: "PER_EVENT_LEDGER_RETIRED",
    })
    await expect(
      applyReceiveItem(
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
