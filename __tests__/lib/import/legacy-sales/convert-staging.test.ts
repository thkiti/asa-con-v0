import { groupValidLegacySalesRows } from "@/lib/import/legacy-sales/convert-staging"
import type { LegacySalesRowRef } from "@/lib/import/legacy-sales/types"

describe("legacy sales convert staging", () => {
  const baseRow: LegacySalesRowRef = {
    id: "row-1",
    status: "VALID",
    legacyTransNo: "T100",
    legacyDate: "01/01/2026",
    legacyTime: "10:00:00",
    legacyBranchId: "006",
    legacyStaffId: "011",
    legacyProductCode: "0104001",
    qty: 1,
    amount: { toString: () => "95" },
    normalizedSaleDateTime: new Date(2026, 0, 1, 10, 0, 0),
    mappedBranchId: "branch-6",
    mappedStaffId: "011",
    mappedProductId: "product-1",
    createdSaleId: null,
  }

  it("groups lines into one transaction by branch/date/S_TRANS", () => {
    const groups = groupValidLegacySalesRows([
      baseRow,
      {
        ...baseRow,
        id: "row-2",
        legacyProductCode: "0101108",
        amount: { toString: () => "50" },
      },
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.lines).toHaveLength(2)
  })

  it("keeps duplicate S_TRANS on different branches separate", () => {
    const groups = groupValidLegacySalesRows([
      baseRow,
      {
        ...baseRow,
        id: "row-3",
        legacyBranchId: "007",
        mappedBranchId: "branch-7",
      },
    ])

    expect(groups).toHaveLength(2)
  })
})

describe("legacy sales convert idempotency", () => {
  it("uses LegacySaleReference unique key for repeated convert", async () => {
    const legacySaleReference = {
      findUnique: jest.fn(async () => ({ saleId: "sale-existing" })),
    }
    const receipt = {
      findUnique: jest.fn(async () => ({ id: "receipt-existing" })),
    }
    const legacySalesImportRow = {
      findMany: jest.fn(async () => [
        {
          id: "row-1",
          status: "VALID",
          legacyTransNo: "T100",
          legacyDate: "01/01/2026",
          legacyTime: "10:00:00",
          legacyBranchId: "006",
          legacyStaffId: null,
          legacyProductCode: "0104001",
          qty: 1,
          amount: { toString: () => "95" },
          normalizedSaleDateTime: new Date(2026, 0, 1, 10, 0, 0),
          mappedBranchId: "branch-6",
          mappedStaffId: null,
          mappedProductId: "product-1",
          createdSaleId: null,
        },
      ]),
      updateMany: jest.fn(async () => ({ count: 1 })),
    }
    const legacySalesImportBatch = {
      findUnique: jest.fn(async () => ({
        id: "batch-1",
        sourceFileName: "SAE.dbf",
      })),
      update: jest.fn(async () => ({})),
    }
    const product = {
      findMany: jest.fn(async () => [{ id: "product-1", productType: "TRACKED" }]),
    }

    const tx = jest.fn()
    const db = {
      legacySalesImportBatch,
      legacySalesImportRow,
      legacySaleReference,
      receipt,
      product,
      $transaction: tx,
    }

    const { runLegacySalesConvertStaging } = await import("@/lib/import/legacy-sales/convert-staging")
    const summary = await runLegacySalesConvertStaging(db as never, {
      batchId: "batch-1",
      apply: true,
    })

    expect(summary.createdSales).toBe(0)
    expect(summary.skippedAlreadyImported).toBe(1)
    expect(tx).not.toHaveBeenCalled()
    expect(legacySalesImportRow.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "IMPORTED",
          createdSaleId: "sale-existing",
          createdReceiptId: "receipt-existing",
        }),
      })
    )
  })
})

describe("legacy sales staging totals", () => {
  it("matches grouped transaction and line totals", () => {
    const rows = groupValidLegacySalesRows([
      {
        id: "row-1",
        status: "VALID",
        legacyTransNo: "T1",
        legacyDate: "01/01/2026",
        legacyTime: "10:00:00",
        legacyBranchId: "006",
        legacyStaffId: null,
        legacyProductCode: "0104001",
        qty: 1,
        amount: { toString: () => "95" },
        normalizedSaleDateTime: new Date(2026, 0, 1, 10, 0, 0),
        mappedBranchId: "branch-6",
        mappedStaffId: null,
        mappedProductId: "product-1",
        createdSaleId: null,
      },
      {
        id: "row-2",
        status: "VALID",
        legacyTransNo: "T1",
        legacyDate: "01/01/2026",
        legacyTime: "10:00:00",
        legacyBranchId: "006",
        legacyStaffId: null,
        legacyProductCode: "0101108",
        qty: 2,
        amount: { toString: () => "100" },
        normalizedSaleDateTime: new Date(2026, 0, 1, 10, 0, 0),
        mappedBranchId: "branch-6",
        mappedStaffId: null,
        mappedProductId: "product-2",
        createdSaleId: null,
      },
    ])

    const lineCount = rows.reduce((sum, group) => sum + group.lines.length, 0)
    const totalAmount = rows.reduce(
      (sum, group) =>
        sum + group.lines.reduce((inner, line) => inner + Number(line.amount.toString()), 0),
      0
    )

    expect(rows).toHaveLength(1)
    expect(lineCount).toBe(2)
    expect(totalAmount).toBe(195)
  })
})
