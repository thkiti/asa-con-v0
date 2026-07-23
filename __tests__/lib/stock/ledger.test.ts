import { issueStock, receiveStock } from "@/lib/stock/ledger"
import { applyIssueItem } from "@/lib/stock/issue-stock"
import { applyReceiveItem } from "@/lib/stock/receive-stock"
import { StockLedgerError } from "@/lib/stock/stock-errors"
import {
  AUTHORIZED_STOCK_TRANSACTION_SOURCE,
  assertCanCreateStockTransaction,
  createStockTransaction,
} from "@/lib/stock/stock-transaction-authority"

describe("retired per-event stock ledger", () => {
  it("issueStock throws PER_EVENT_LEDGER_RETIRED", async () => {
    await expect(
      issueStock({
        branchId: "b1",
        refType: "POS_SALE",
        refId: "s1",
        items: [{ productId: "p1", qty: 1 }],
      })
    ).rejects.toMatchObject({
      code: "PER_EVENT_LEDGER_RETIRED",
    })
  })

  it("receiveStock throws PER_EVENT_LEDGER_RETIRED", async () => {
    await expect(
      receiveStock({
        branchId: "b1",
        refType: "STOCK_DOC_PURCHASE",
        refId: "d1",
        items: [{ productId: "p1", qty: 1 }],
      })
    ).rejects.toMatchObject({
      code: "PER_EVENT_LEDGER_RETIRED",
    })
  })

  it("applyIssueItem / applyReceiveItem throw without writing", async () => {
    const tx = {} as never
    await expect(
      applyIssueItem(
        tx,
        {
          branchId: "b1",
          refType: "X",
          refId: "r",
          documentId: null,
          date: new Date(),
        },
        { productId: "p1", qty: 1 }
      )
    ).rejects.toBeInstanceOf(StockLedgerError)

    await expect(
      applyReceiveItem(
        tx,
        {
          branchId: "b1",
          refType: "X",
          refId: "r",
          documentId: null,
          date: new Date(),
        },
        { productId: "p1", qty: 1 }
      )
    ).rejects.toBeInstanceOf(StockLedgerError)
  })
})

describe("stock-transaction-authority", () => {
  it("rejects non-authorized sources", () => {
    expect(() => assertCanCreateStockTransaction("POS_SALE")).toThrow(
      /END_COST_CALCULATION/
    )
    expect(() => assertCanCreateStockTransaction(null)).toThrow(StockLedgerError)
  })

  it("authorized source constant is END_COST_CALCULATION", () => {
    expect(AUTHORIZED_STOCK_TRANSACTION_SOURCE).toBe("END_COST_CALCULATION")
  })

  it("createStockTransaction still fails until Cost Calculation is implemented", async () => {
    await expect(
      createStockTransaction({
        source: AUTHORIZED_STOCK_TRANSACTION_SOURCE,
        data: {} as never,
        tx: {} as never,
      })
    ).rejects.toMatchObject({
      code: "COST_CALCULATION_NOT_IMPLEMENTED",
    })
  })
})
