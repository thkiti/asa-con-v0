import {
  STAFF_BOOTSTRAP_ADMIN_EXISTS_WARNING,
  STAFF_BOOTSTRAP_MAPPING_WARNING,
} from "@/lib/import/constants"
import { mapStaffBootstrapRow } from "@/lib/import/parsers/staff-dbf"
import { runStaffImport } from "@/lib/import/services/staff-import"
import {
  getDefaultStaffPasswordHash,
  resetDefaultStaffPasswordHashCache,
  STAFF_DEFAULT_PASSWORD,
  verifyDefaultStaffPassword,
} from "@/lib/import/staff-password"
import type { ImportDb, ImportProfile } from "@/lib/import/types"

const profile: ImportProfile = {
  id: "test",
  sourceDir: "unused",
  branchFile: "SHP.DBF",
  productFile: "POSINY.DBF",
  staffFile: "EME.DBF",
  referenceStockFiles: [],
  hoBranch: { code: "HO999", name: "Head Office", type: "HO" },
  bootstrapShopBranch: { code: "SH001", name: "Bootstrap Shop", type: "SH" },
}

jest.mock("@/lib/import/parsers/staff-dbf", () => ({
  resolveStaffDbfPath: jest.fn(() => "EME.DBF"),
  parseStaffDbf: jest.fn(async () => ({
    rows: [
      {
        staffId: "001",
        name: "Admin User",
        role: "HO_ADMIN",
        branchCode: "HO999",
        deleted: false,
      },
      {
        staffId: "002",
        name: "Shop User",
        role: "SH_STAFF",
        branchCode: "SH001",
        deleted: false,
      },
    ],
    skipped: 0,
    errors: [],
  })),
  mapStaffBootstrapRow: jest.requireActual("@/lib/import/parsers/staff-dbf").mapStaffBootstrapRow,
}))

function makeDb(initialStaff: Record<
  string,
  { id: string; name: string; role: string; branchId: string; deleted: boolean; password?: string }
> = {}) {
  const branches = new Map([
    ["HO999", { id: "branch-ho", name: "Head Office", isActive: true, deleted: false }],
    ["SH001", { id: "branch-sh", name: "Bootstrap Shop", isActive: true, deleted: false }],
  ])
  const staff = new Map(Object.entries(initialStaff))

  return {
    db: {
      branch: {
        findUnique: jest.fn(async ({ where }: { where: { code: string } }) => {
          const hit = branches.get(where.code)
          return hit ? { id: hit.id, name: hit.name, isActive: hit.isActive, deleted: hit.deleted } : null
        }),
        upsert: jest.fn(),
      },
      product: { findUnique: jest.fn(), upsert: jest.fn() },
      referenceStock: { findUnique: jest.fn(), upsert: jest.fn() },
      staff: {
        findUnique: jest.fn(async ({ where }: { where: { staffId: string } }) =>
          staff.get(where.staffId) ?? null
        ),
        upsert: jest.fn(async ({ where, create, update }: { where: { staffId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
          const existing = staff.get(where.staffId)
          const next = existing
            ? { ...existing, ...update }
            : { id: `staff-${where.staffId}`, ...(create as typeof existing) }
          staff.set(where.staffId, next as (typeof initialStaff)[string])
          return { id: (next as { id: string }).id }
        }),
      },
    } as ImportDb,
    staff,
  }
}

describe("staff password", () => {
  beforeEach(() => {
    resetDefaultStaffPasswordHashCache()
  })

  it("uses default password 1234 with bcrypt hash", async () => {
    const hash = await getDefaultStaffPasswordHash()
    expect(STAFF_DEFAULT_PASSWORD).toBe("1234")
    await expect(verifyDefaultStaffPassword(hash)).resolves.toBe(true)
  })
})

describe("staff bootstrap mapping", () => {
  beforeEach(() => {
    resetDefaultStaffPasswordHashCache()
  })

  it("maps 001 to HO_ADMIN on HO999", () => {
    expect(
      mapStaffBootstrapRow({
        E_ID: "001",
        E_NAME: "Admin",
        E_SURNAME: "User",
      })
    ).toMatchObject({
      staffId: "001",
      role: "HO_ADMIN",
      branchCode: "HO999",
    })
  })

  it("maps other staff to SH_STAFF on SH001", () => {
    expect(
      mapStaffBootstrapRow({
        E_ID: "002",
        E_NAME: "Shop",
        E_SURNAME: "Staff",
      })
    ).toMatchObject({
      staffId: "002",
      role: "SH_STAFF",
      branchCode: "SH001",
    })
  })

  it("warns when bootstrap branches are missing", async () => {
    const { db } = makeDb()
    ;(db.branch.findUnique as jest.Mock).mockResolvedValue(null)

    const report = await runStaffImport({ db, profile, apply: false })
    expect(report.errors.some((error) => error.includes("HO999"))).toBe(true)
    expect(report.wouldInsert).toBe(0)
  })

  it("does not write staff on apply when bootstrap branches are missing", async () => {
    const { db } = makeDb()
    ;(db.branch.findUnique as jest.Mock).mockResolvedValue(null)

    const report = await runStaffImport({ db, profile, apply: true })

    expect(report.errors.length).toBeGreaterThan(0)
    expect(report.inserted).toBe(0)
    expect(report.updated).toBe(0)
    expect(db.staff.upsert).not.toHaveBeenCalled()
  })

  it("includes simplified bootstrap warning on successful dry-run", async () => {
    const report = await runStaffImport({ db: makeDb().db, profile, apply: false })
    expect(report.warnings).toContain(STAFF_BOOTSTRAP_MAPPING_WARNING)
    expect(report.wouldInsert).toBe(2)
  })

  it("stores bcrypt hash of 1234 for new staff on apply", async () => {
    const { db, staff } = makeDb()
    await runStaffImport({ db, profile, apply: true })

    const shop = staff.get("002")
    expect(shop?.password).toBeDefined()
    await expect(verifyDefaultStaffPassword(String(shop?.password))).resolves.toBe(true)
  })

  it("creates 001 as HO_ADMIN on HO999 with default password 1234 on apply", async () => {
    const { db, staff } = makeDb()
    await runStaffImport({ db, profile, apply: true })

    const admin = staff.get("001")
    expect(admin).toMatchObject({
      role: "HO_ADMIN",
      branchId: "branch-ho",
    })
    await expect(verifyDefaultStaffPassword(String(admin?.password))).resolves.toBe(true)
  })

  it("preserves existing 001 password and updates safe fields only", async () => {
    const { db, staff } = makeDb({
      "001": {
        id: "staff-001",
        name: "Old Name",
        role: "HO_ADMIN",
        branchId: "branch-ho",
        deleted: false,
        password: "custom-existing-hash",
      },
    })

    const report = await runStaffImport({ db, profile, apply: true })

    expect(report.updated).toBe(1)
    expect(report.warnings).toContain(STAFF_BOOTSTRAP_ADMIN_EXISTS_WARNING)
    expect(staff.get("001")?.password).toBe("custom-existing-hash")
    expect(staff.get("001")?.name).toBe("Admin User")
    expect(staff.get("001")?.role).toBe("HO_ADMIN")
    expect(staff.get("001")?.branchId).toBe("branch-ho")
  })

  it("reports existing 001 without changes as skipped", async () => {
    const { db } = makeDb({
      "001": {
        id: "staff-001",
        name: "Admin User",
        role: "HO_ADMIN",
        branchId: "branch-ho",
        deleted: false,
        password: "custom-existing-hash",
      },
    })

    const report = await runStaffImport({ db, profile, apply: false })

    expect(report.wouldUpdate).toBe(0)
    expect(report.skipped).toBeGreaterThan(0)
    expect(report.warnings).toContain(STAFF_BOOTSTRAP_ADMIN_EXISTS_WARNING)
  })
})
