import { runBranchImport } from "@/lib/import/services/branch-import"
import { runHoManifestImport } from "@/lib/import/services/ho-manifest"
import { runProductImport } from "@/lib/import/services/product-import"
import { runReferenceStockImport } from "@/lib/import/services/reference-stock-import"
import type { BranchImportRow, ImportDb, ImportProfile, ProductImportRow } from "@/lib/import/types"

function makeBranchDb(initial: BranchImportRow[] = []): ImportDb {
  const rows = new Map(initial.map((row) => [row.code, { id: `branch-${row.code}`, ...row }]))

  return {
    branch: {
      findUnique: jest.fn(async ({ where }) => rows.get(where.code) ?? null),
      upsert: jest.fn(async ({ where, create, update }) => {
        const existing = rows.get(where.code)
        const next = existing ? { ...existing, ...update } : { id: `branch-${where.code}`, ...create }
        rows.set(where.code, next)
        return { id: next.id }
      }),
    },
    product: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    referenceStock: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    staff: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  }
}

function makeProductDb(initial: ProductImportRow[] = []): ImportDb {
  const rows = new Map(initial.map((row) => [row.code, { id: `prod-${row.code}`, ...row }]))

  return {
    branch: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    product: {
      findUnique: jest.fn(async ({ where }) => rows.get(where.code) ?? null),
      upsert: jest.fn(async ({ where, create, update }) => {
        const existing = rows.get(where.code)
        const next = existing ? { ...existing, ...update } : { id: `prod-${where.code}`, ...create }
        rows.set(where.code, next)
        return { id: next.id }
      }),
    },
    referenceStock: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    staff: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  }
}

function makeReferenceDb(productCode: string) {
  const productId = `prod-${productCode}`
  const rows = new Map<
    string,
    {
      id: string
      supplierCode: string
      productCode: string
      productGroup: string | null
      deleted: boolean
    }
  >()

  const db: ImportDb = {
    branch: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    product: {
      findUnique: jest.fn(async ({ where }) =>
        where.code === productCode ? { id: productId, deleted: false } : null
      ),
      upsert: jest.fn(),
    },
    referenceStock: {
      findUnique: jest.fn(async ({ where }) => {
        const key = `${where.productId_hookGroup_hookNo.productId}|${where.productId_hookGroup_hookNo.hookGroup}|${where.productId_hookGroup_hookNo.hookNo}`
        return rows.get(key) ?? null
      }),
      upsert: jest.fn(async ({ where, create, update }) => {
        const key = `${where.productId_hookGroup_hookNo.productId}|${where.productId_hookGroup_hookNo.hookGroup}|${where.productId_hookGroup_hookNo.hookNo}`
        const existing = rows.get(key)
        if (existing) {
          rows.set(key, {
            id: existing.id,
            supplierCode: update.supplierCode,
            productCode: update.productCode,
            productGroup: update.productGroup,
            deleted: update.deleted,
          })
          return { id: existing.id }
        }
        const id = `ref-${rows.size + 1}`
        rows.set(key, {
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

  return { db, rows, productId }
}

const branchProfile: ImportProfile = {
  id: "test",
  sourceDir: "unused",
  branchFile: "missing.dbf",
  productFile: "missing.dbf",
  staffFile: "EME.DBF",
  referenceStockFiles: [],
  hoBranch: { code: "HO999", name: "Head Office", type: "HO" },
  bootstrapShopBranch: {
    code: "SH999",
    name: "Temporary Shop / Transfer Buffer",
    type: "SH",
  },
}

jest.mock("@/lib/import/parsers/branch-dbf", () => ({
  parseBranchDbf: jest.fn(async () => ({
    rows: [
      {
        code: "SH001",
        name: "Branch One",
        type: "SH",
        isActive: true,
        deleted: false,
      },
    ],
    skipped: 0,
    errors: [],
  })),
  resolveBranchDbfPath: jest.fn(() => "SHP.DBF"),
}))

jest.mock("@/lib/import/parsers/product-dbf", () => ({
  parseProductDbf: jest.fn(async () => ({
    rows: [
      {
        code: "0101001",
        groupCode: 1,
        typeCode: 1,
        runningCode: 1,
        name: "Product One",
        productType: "TRACKED",
        deleted: false,
      },
    ],
    skipped: 0,
    errors: [],
  })),
  resolveProductDbfPath: jest.fn(() => "POSINY.DBF"),
}))

jest.mock("@/lib/import/parsers/reference-csv", () => ({
  parseReferenceCsvFiles: jest.fn(() => ({
    rows: [
      {
        hookGroup: "K",
        hookNo: 1,
        supplierCode: "K.144",
        productCode: "0101001",
        productGroup: "1019018",
        sourceFile: "kCode.csv",
      },
    ],
    skipped: 0,
    warnings: [],
    errors: [],
  })),
}))

describe("idempotency behavior", () => {
  it("does not duplicate Branch on repeated import", async () => {
    const db = makeBranchDb()

    const first = await runBranchImport({ db, profile: branchProfile, apply: true })
    const second = await runBranchImport({ db, profile: branchProfile, apply: true })

    expect(first.inserted).toBe(1)
    expect(second.inserted).toBe(0)
    expect(second.updated).toBe(0)
    expect(second.skipped).toBe(1)
    expect(db.branch.upsert).toHaveBeenCalledTimes(1)
  })

  it("does not duplicate Product on repeated import", async () => {
    const db = makeProductDb()

    const first = await runProductImport({ db, profile: branchProfile, apply: true })
    const second = await runProductImport({ db, profile: branchProfile, apply: true })

    expect(first.inserted).toBe(1)
    expect(second.inserted).toBe(0)
    expect(second.updated).toBe(0)
    expect(second.skipped).toBe(1)
    expect(db.product.upsert).toHaveBeenCalledTimes(1)
  })

  it("does not duplicate ReferenceStock on repeated import", async () => {
    const { db, rows } = makeReferenceDb("0101001")

    const first = await runReferenceStockImport({
      db,
      profile: branchProfile,
      apply: true,
    })
    const second = await runReferenceStockImport({
      db,
      profile: branchProfile,
      apply: true,
    })

    expect(first.inserted).toBe(1)
    expect(second.inserted).toBe(0)
    expect(second.updated).toBe(0)
    expect(second.skipped).toBe(1)
    expect(rows.size).toBe(1)
    expect(db.referenceStock.upsert).toHaveBeenCalledTimes(1)
  })

  it("does not duplicate HO branch on repeated manifest import", async () => {
    const db = makeBranchDb()

    const first = await runHoManifestImport({ db, profile: branchProfile, apply: true })
    const second = await runHoManifestImport({ db, profile: branchProfile, apply: true })

    expect(first.inserted).toBe(1)
    expect(second.skipped).toBe(1)
    expect(db.branch.upsert).toHaveBeenCalledTimes(1)
  })
})

describe("production safety guard", () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("refuses apply in production without override", async () => {
    process.env.NODE_ENV = "production"
    delete process.env.IMPORT_ALLOW_PRODUCTION

    const { assertImportApplyAllowed } = await import("@/lib/import/safety")
    expect(() => assertImportApplyAllowed(true)).toThrow(/Refusing import apply/)
  })
})
