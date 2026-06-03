import {
  BOOTSTRAP_HO_BRANCH_CODE,
  BOOTSTRAP_SHOP_BRANCH_CODE,
  BOOTSTRAP_SHOP_BRANCH_NAME,
} from "@/lib/import/constants"
import { getDevboardV1Profile } from "@/lib/import/profiles/devboard-v1"
import {
  runBootstrapBranchEnsure,
  validateBootstrapBranches,
} from "@/lib/import/services/bootstrap-branches"
import type { ImportDb, ImportProfile } from "@/lib/import/types"

const profile: ImportProfile = {
  id: "test",
  sourceDir: "unused",
  branchFile: "SHP.DBF",
  productFile: "POSINY.DBF",
  staffFile: "EME.DBF",
  referenceStockFiles: [],
  hoBranch: { code: BOOTSTRAP_HO_BRANCH_CODE, name: "Head Office", type: "HO" },
  bootstrapShopBranch: {
    code: BOOTSTRAP_SHOP_BRANCH_CODE,
    name: BOOTSTRAP_SHOP_BRANCH_NAME,
    type: "SH",
  },
}

function makeDb(initial: Record<string, { id: string; name: string; type: string; isActive: boolean; deleted: boolean }> = {}) {
  const branches = new Map(Object.entries(initial))

  return {
    db: {
      branch: {
        findUnique: jest.fn(async ({ where }: { where: { code: string } }) => {
          const hit = branches.get(where.code)
          return hit ?? null
        }),
        upsert: jest.fn(async ({ where, create }: { where: { code: string }; create: Record<string, unknown> }) => {
          const id = `branch-${where.code}`
          branches.set(where.code, {
            id,
            name: String(create.name),
            type: String(create.type),
            isActive: Boolean(create.isActive),
            deleted: Boolean(create.deleted),
          })
          return { id }
        }),
      },
    } as ImportDb,
    branches,
  }
}

describe("devboard-v1 profile bootstrap shop branch", () => {
  it("uses SH999 transfer buffer branch", () => {
    const resolved = getDevboardV1Profile()
    expect(resolved.bootstrapShopBranch).toEqual({
      code: "SH999",
      name: BOOTSTRAP_SHOP_BRANCH_NAME,
      type: "SH",
    })
  })
})

describe("validateBootstrapBranches", () => {
  it("requires HO999 and SH999", async () => {
    const { db } = makeDb()
    const result = await validateBootstrapBranches(db)
    expect(result.missingCodes).toEqual([BOOTSTRAP_HO_BRANCH_CODE, BOOTSTRAP_SHOP_BRANCH_CODE])
  })

  it("passes when HO999 and SH999 are active", async () => {
    const { db } = makeDb({
      [BOOTSTRAP_HO_BRANCH_CODE]: {
        id: "ho",
        name: "Head Office",
        type: "HO",
        isActive: true,
        deleted: false,
      },
      [BOOTSTRAP_SHOP_BRANCH_CODE]: {
        id: "sh999",
        name: BOOTSTRAP_SHOP_BRANCH_NAME,
        type: "SH",
        isActive: true,
        deleted: false,
      },
    })

    const result = await validateBootstrapBranches(db)
    expect(result.missingCodes).toEqual([])
    expect(result.branches[BOOTSTRAP_SHOP_BRANCH_CODE]?.id).toBe("sh999")
  })
})

describe("runBootstrapBranchEnsure", () => {
  it("creates SH999 on apply when missing", async () => {
    const { db, branches } = makeDb({
      [BOOTSTRAP_HO_BRANCH_CODE]: {
        id: "ho",
        name: "Head Office",
        type: "HO",
        isActive: true,
        deleted: false,
      },
    })

    const report = await runBootstrapBranchEnsure({ db, profile, apply: true })

    expect(report.wouldInsert).toBe(1)
    expect(report.inserted).toBe(1)
    expect(branches.get(BOOTSTRAP_SHOP_BRANCH_CODE)).toMatchObject({
      name: BOOTSTRAP_SHOP_BRANCH_NAME,
      type: "SH",
      isActive: true,
      deleted: false,
    })
  })

  it("dry-run reports wouldInsert for missing bootstrap pair", async () => {
    const { db } = makeDb()
    const report = await runBootstrapBranchEnsure({ db, profile, apply: false })
    expect(report.wouldInsert).toBe(2)
    expect(report.sampleRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: BOOTSTRAP_HO_BRANCH_CODE }),
        expect.objectContaining({
          code: BOOTSTRAP_SHOP_BRANCH_CODE,
          name: BOOTSTRAP_SHOP_BRANCH_NAME,
          type: "SH",
        }),
      ])
    )
  })
})
