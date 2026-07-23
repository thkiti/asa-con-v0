import {
  executeRetiredStockTransactionCleanup,
  inspectRetiredStockTransactions,
} from "@/lib/stock/cleanup-retired-stock-transactions"

type Row = { refType: string; branchId: string; date: Date }

function createFakeDb(rows: Row[]) {
  let store = [...rows]
  return {
    stockTransaction: {
      findMany: jest.fn(async () => store.map((r) => ({ ...r }))),
      count: jest.fn(async () => store.length),
      deleteMany: jest.fn(async () => {
        const count = store.length
        store = []
        return { count }
      }),
    },
    stock: { count: jest.fn(async () => 3) },
    stockLayer: { count: jest.fn(async () => 5) },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        stockTransaction: {
          deleteMany: async () => {
            const count = store.length
            store = []
            return { count }
          },
        },
      })
    ),
  }
}

describe("cleanup-retired-stock-transactions", () => {
  it("reports counts by refType, branch, and month", async () => {
    const db = createFakeDb([
      {
        refType: "POS_SALE",
        branchId: "b1",
        date: new Date("2026-01-10"),
      },
      {
        refType: "POS_SALE",
        branchId: "b1",
        date: new Date("2026-01-20"),
      },
      {
        refType: "STOCK_DOC_ADJUSTMENT",
        branchId: "b2",
        date: new Date("2026-02-01"),
      },
    ])

    const report = await inspectRetiredStockTransactions(db as never)
    expect(report.total).toBe(3)
    expect(report.byRefType.POS_SALE).toBe(2)
    expect(report.byRefType.STOCK_DOC_ADJUSTMENT).toBe(1)
    expect(report.byBranchId.b1).toBe(2)
    expect(report.byYearMonth["2026-01"]).toBe(2)
    expect(report.inboundForeignKeys).toEqual([])
    expect(report.relatedStockRowCount).toBe(3)
  })

  it("deletes all rows and is idempotent on rerun", async () => {
    const db = createFakeDb([
      {
        refType: "POS_SALE",
        branchId: "b1",
        date: new Date("2026-01-10"),
      },
    ])

    const first = await executeRetiredStockTransactionCleanup(db as never)
    expect(first.deleted).toBe(1)
    expect(first.remaining).toBe(0)

    const second = await executeRetiredStockTransactionCleanup(db as never)
    expect(second.deleted).toBe(0)
    expect(second.remaining).toBe(0)
  })
})
