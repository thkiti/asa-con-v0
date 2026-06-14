import { runLegacySalesValidateStaging } from "@/lib/import/legacy-sales/validate-staging"

describe("legacy sales validate staging", () => {
  it("blocks import when product is unmatched", async () => {
    const db = {
      legacySalesImportBatch: {
        findUnique: jest.fn(async () => ({
          id: "batch-1",
          sourceFileName: "SAE.dbf",
          year: 2026,
        })),
      },
      legacySalesImportRow: {
        findMany: jest.fn(async () => [
          {
            id: "row-1",
            status: "PENDING",
            legacyTransNo: "T1",
            legacyDate: "01/01/2026",
            legacyTime: "10:00:00",
            legacyBranchId: "006",
            legacyStaffId: "011",
            legacyProductCode: "9999999",
            qty: 1,
            amount: { toString: () => "100" },
            normalizedSaleDateTime: new Date("2026-01-01T10:00:00"),
            mappedBranchId: null,
            mappedStaffId: null,
            mappedProductId: null,
            createdSaleId: null,
          },
        ]),
        update: jest.fn(),
      },
      branch: {
        findMany: jest.fn(async () => [{ id: "branch-6", code: "SH006" }]),
      },
      product: {
        findMany: jest.fn(async () => [{ id: "product-1", code: "0104001" }]),
      },
      staff: {
        findMany: jest.fn(async () => [{ staffId: "011" }]),
      },
    }

    const summary = await runLegacySalesValidateStaging(db as never, {
      batchId: "batch-1",
      apply: false,
    })

    expect(summary.validRows).toBe(0)
    expect(summary.invalidRows).toBe(1)
    expect(summary.unmatchedProducts).toEqual(["9999999"])
  })
})
