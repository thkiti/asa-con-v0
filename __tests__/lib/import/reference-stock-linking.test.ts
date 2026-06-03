import {
  createEmptyPhaseReport,
  finalizeImportReport,
  summarizeImportReport,
} from "@/lib/import/report"
import { runReferenceStockImport } from "@/lib/import/services/reference-stock-import"
import type { ImportDb, ImportProfile } from "@/lib/import/types"
import path from "path"

const fixtureDir = path.join(__dirname, "../../fixtures/import")

function makeProfile(): ImportProfile {
  return {
    id: "test-profile",
    sourceDir: fixtureDir,
    branchFile: "SHP.DBF",
    productFile: "POSINY.DBF",
    referenceStockFiles: [
      { fileName: "kCode.csv", hookGroup: "K" },
      { fileName: "cCode.csv", hookGroup: "C" },
      { fileName: "mCode.csv", hookGroup: "M" },
    ],
    hoBranch: {
      code: "HO999",
      name: "Head Office",
      type: "HO",
    },
    bootstrapShopBranch: {
      code: "SH999",
      name: "Bootstrap Shop",
      type: "SH",
    },
    staffFile: "EME.DBF",
  }
}

function makeDb(productCodes: string[]): ImportDb {
  const products = new Map(productCodes.map((code) => [code, { id: `prod-${code}` }]))
  const referenceRows = new Map<
    string,
    {
      id: string
      supplierCode: string
      productCode: string
      productGroup: string | null
      deleted: boolean
    }
  >()

  return {
    branch: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    product: {
      findUnique: jest.fn(async ({ where }) => {
        const hit = products.get(where.code)
        return hit ? { id: hit.id, name: "Test", deleted: false } : null
      }),
      upsert: jest.fn(),
    },
    referenceStock: {
      findUnique: jest.fn(async ({ where }) => {
        const key = `${where.productId_hookGroup_hookNo.productId}|${where.productId_hookGroup_hookNo.hookGroup}|${where.productId_hookGroup_hookNo.hookNo}`
        return referenceRows.get(key) ?? null
      }),
      upsert: jest.fn(async ({ where, create, update }) => {
        const key = `${where.productId_hookGroup_hookNo.productId}|${where.productId_hookGroup_hookNo.hookGroup}|${where.productId_hookGroup_hookNo.hookNo}`
        const existing = referenceRows.get(key)
        if (existing) {
          referenceRows.set(key, {
            id: existing.id,
            supplierCode: update.supplierCode,
            productCode: update.productCode,
            productGroup: update.productGroup,
            deleted: update.deleted,
          })
          return { id: existing.id }
        }
        const id = `ref-${referenceRows.size + 1}`
        referenceRows.set(key, {
          id,
          supplierCode: create.supplierCode,
          productCode: create.productCode,
          productGroup: create.productGroup,
          deleted: create.deleted,
        })
        return { id }
      }),
    },
    staff: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  }
}

describe("ReferenceStock product linking", () => {
  it("reports missing product references without failing", async () => {
    const report = await runReferenceStockImport({
      db: makeDb([]),
      profile: makeProfile(),
      apply: false,
    })

    expect(report.missingProductReferences.length).toBeGreaterThan(0)
    expect(report.wouldInsert).toBe(0)
  })

  it("plans inserts when linked products exist", async () => {
    const report = await runReferenceStockImport({
      db: makeDb(["0101001", "0101002", "2101032", "5101001"]),
      profile: makeProfile(),
      apply: false,
      pendingProductCodes: new Set(["0101001", "0101002", "2101032", "5101001"]),
    })

    expect(report.wouldInsert).toBeGreaterThan(0)
    expect(report.missingProductReferences).toHaveLength(0)
  })
})

describe("dry-run report counts", () => {
  it("aggregates phase totals in finalizeImportReport", () => {
    const report = finalizeImportReport({
      profile: "devboard-v1",
      mode: "dry-run",
      sourceDir: fixtureDir,
      startedAt: new Date().toISOString(),
      completedAt: "",
      phases: [
        {
          ...createEmptyPhaseReport("branch"),
          rowsRead: 10,
          wouldInsert: 8,
          wouldUpdate: 1,
          skipped: 1,
        },
        {
          ...createEmptyPhaseReport("reference-stock"),
          rowsRead: 4,
          wouldInsert: 3,
          skipped: 1,
          missingProductReferences: ["missing"],
        },
      ],
      totals: summarizeImportReport({ phases: [] } as never),
    })

    expect(report.totals.rowsRead).toBe(14)
    expect(report.totals.wouldInsert).toBe(11)
    expect(report.totals.wouldUpdate).toBe(1)
    expect(report.totals.skipped).toBe(2)
    expect(report.totals.missingProductReferences).toBe(1)
  })
})
