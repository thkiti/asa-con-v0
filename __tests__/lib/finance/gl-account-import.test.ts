import { GlAccountType, Prisma } from "@/generated/prisma/client"
import { parseGlAccountCsv } from "@/lib/finance/gl-account-csv-parser"
import { GlAccountImportError } from "@/lib/finance/gl-account-import-errors"
import {
  applyGlAccountImport,
  buildImportPreview,
  prepareGlAccountImportApply,
} from "@/lib/finance/gl-account-import"

type GlRow = {
  id: string
  code: string
  name: string
  accountType: GlAccountType
  parentId: string | null
  isActive: boolean
  deleted: boolean
  parent?: { code: string } | null
  _count: { journalEntryLines: number }
}

function makePrisma(state: { accounts: GlRow[] }) {
  return {
    glAccount: {
      findMany: async ({
        where,
      }: {
        where?: { code?: { in: string[] } }
      }) => {
        if (where?.code?.in) {
          return state.accounts.filter((a) => where.code!.in.includes(a.code))
        }
        return [...state.accounts]
      },
      findUnique: async ({ where }: { where: { code: string } }) =>
        state.accounts.find((a) => a.code === where.code) ?? null,
      create: async ({
        data,
      }: {
        data: {
          code: string
          name: string
          accountType: GlAccountType
          parentId: string | null
          isActive: boolean
          deleted: boolean
        }
      }) => {
        const row: GlRow = {
          id: `gl-${data.code}`,
          code: data.code,
          name: data.name,
          accountType: data.accountType,
          parentId: data.parentId,
          isActive: data.isActive,
          deleted: data.deleted,
          parent: null,
          _count: { journalEntryLines: 0 },
        }
        state.accounts.push(row)
        return row
      },
      update: async ({
        where,
        data,
      }: {
        where: { code: string }
        data: Partial<GlRow>
      }) => {
        const idx = state.accounts.findIndex((a) => a.code === where.code)
        if (idx < 0) throw new Error("not found")
        state.accounts[idx] = { ...state.accounts[idx]!, ...data }
        return state.accounts[idx]
      },
    },
    journalEntryLine: {
      count: async () => 0,
    },
  }
}

describe("buildImportPreview", () => {
  it("detects inserts and updates", async () => {
    const prisma = makePrisma({
      accounts: [
        {
          id: "gl-1100",
          code: "1100",
          name: "Old Cash",
          accountType: GlAccountType.ASSET,
          parentId: null,
          isActive: true,
          deleted: false,
          parent: null,
          _count: { journalEntryLines: 0 },
        },
      ],
    })

    const csv = `accountCode,accountName,accountType,normalBalance
1100,Cash on hand,ASSET,DEBIT
4000,Revenue,REVENUE,CREDIT`
    const parsed = parseGlAccountCsv(csv)
    const preview = await buildImportPreview(
      prisma,
      parsed.rows,
      parsed.errors,
      parsed.warnings
    )

    expect(preview.summary.insertCount).toBe(1)
    expect(preview.summary.updateCount).toBe(1)
    expect(preview.updates[0]?.accountCode).toBe("1100")
  })

  it("blocks accountType change when journal lines exist", async () => {
    const prisma = makePrisma({
      accounts: [
        {
          id: "gl-4000",
          code: "4000",
          name: "Revenue",
          accountType: GlAccountType.REVENUE,
          parentId: null,
          isActive: true,
          deleted: false,
          parent: null,
          _count: { journalEntryLines: 3 },
        },
      ],
    })

    const csv = `accountCode,accountName,accountType,normalBalance
4000,Revenue,EXPENSE,DEBIT`
    const parsed = parseGlAccountCsv(csv)
    const preview = await buildImportPreview(
      prisma,
      parsed.rows,
      parsed.errors,
      parsed.warnings
    )

    expect(preview.summary.blockedCount).toBe(1)
    expect(preview.blocked[0]?.blockReason).toBe("BLOCKED_ACCOUNT_TYPE_CHANGE")
  })

  it("warns on parent change with journal activity", async () => {
    const prisma = makePrisma({
      accounts: [
        {
          id: "gl-1000",
          code: "1000",
          name: "Assets",
          accountType: GlAccountType.ASSET,
          parentId: null,
          isActive: true,
          deleted: false,
          parent: null,
          _count: { journalEntryLines: 0 },
        },
        {
          id: "gl-1100",
          code: "1100",
          name: "Cash",
          accountType: GlAccountType.ASSET,
          parentId: null,
          isActive: true,
          deleted: false,
          parent: null,
          _count: { journalEntryLines: 2 },
        },
      ],
    })

    const csv = `accountCode,accountName,accountType,normalBalance,parentAccountCode
1000,Assets,ASSET,DEBIT,
1100,Cash,ASSET,DEBIT,1000`
    const parsed = parseGlAccountCsv(csv)
    const preview = await buildImportPreview(
      prisma,
      parsed.rows,
      parsed.errors,
      parsed.warnings
    )

    const cashUpdate = preview.updates.find((u) => u.accountCode === "1100")
    expect(cashUpdate?.warnings?.length).toBeGreaterThan(0)
  })

  it("blocks deactivate when journal lines exist", async () => {
    const prisma = makePrisma({
      accounts: [
        {
          id: "gl-1100",
          code: "1100",
          name: "Cash",
          accountType: GlAccountType.ASSET,
          parentId: null,
          isActive: true,
          deleted: false,
          parent: null,
          _count: { journalEntryLines: 1 },
        },
      ],
    })

    const csv = `accountCode,accountName,accountType,normalBalance,isActive
1100,Cash,ASSET,DEBIT,false`
    const parsed = parseGlAccountCsv(csv)
    const preview = await buildImportPreview(
      prisma,
      parsed.rows,
      parsed.errors,
      parsed.warnings
    )

    expect(preview.blocked[0]?.blockReason).toBe("BLOCKED_HAS_JOURNAL_LINES")
  })
})

describe("prepareGlAccountImportApply", () => {
  it("rejects apply when blocked rows present", async () => {
    const preview = await buildImportPreview(
      makePrisma({ accounts: [] }),
      [],
      [],
      []
    )
    preview.summary.blockedCount = 1
    preview.blocked.push({
      rowNumber: 2,
      accountCode: "4000",
      accountName: "R",
      accountType: GlAccountType.REVENUE,
      normalBalance: "CREDIT",
      parentAccountCode: null,
      isActive: true,
      action: "BLOCKED",
      blockReason: "BLOCKED_ACCOUNT_TYPE_CHANGE",
    })

    await expect(
      prepareGlAccountImportApply(makePrisma({ accounts: [] }), preview)
    ).rejects.toThrow(GlAccountImportError)
  })

  it("orders parent before child for new accounts", async () => {
    const prisma = makePrisma({ accounts: [] })
    const csv = `accountCode,accountName,accountType,normalBalance,parentAccountCode
1100,Cash,ASSET,DEBIT,1000
1000,Assets,ASSET,DEBIT,`
    const parsed = parseGlAccountCsv(csv)
    const preview = await buildImportPreview(
      prisma,
      parsed.rows,
      parsed.errors,
      parsed.warnings
    )

    const prepared = await prepareGlAccountImportApply(prisma, preview)
    expect(prepared.rows.map((r) => r.accountCode)).toEqual(["1000", "1100"])
    expect(prepared.rows[1]?.parentIdFromDb).toBeUndefined()
  })
})

describe("applyGlAccountImport", () => {
  it("upserts accounts in transaction", async () => {
    const state = {
      accounts: [] as GlRow[],
    }
    const prisma = makePrisma(state)
    const tx = {
      glAccount: prisma.glAccount,
      journalEntryLine: prisma.journalEntryLine,
    }

    const csv = `accountCode,accountName,accountType,normalBalance
1100,Cash,ASSET,DEBIT`
    const parsed = parseGlAccountCsv(csv)
    const preview = await buildImportPreview(
      prisma,
      parsed.rows,
      parsed.errors,
      parsed.warnings
    )

    const prepared = await prepareGlAccountImportApply(prisma, preview)
    const result = await applyGlAccountImport(
      tx as unknown as Prisma.TransactionClient,
      prepared
    )
    expect(result.inserted).toBe(1)
    expect(state.accounts).toHaveLength(1)
    expect(state.accounts[0]?.code).toBe("1100")
  })

  it("inserts parent-child chain without per-row lookups", async () => {
    const state = { accounts: [] as GlRow[] }
    const prisma = makePrisma(state)
    const findUniqueSpy = jest.spyOn(prisma.glAccount, "findUnique")
    const tx = {
      glAccount: prisma.glAccount,
      journalEntryLine: prisma.journalEntryLine,
    }

    const csv = `accountCode,accountName,accountType,normalBalance,parentAccountCode
1000,Assets,ASSET,DEBIT,
1100,Cash,ASSET,DEBIT,1000`
    const parsed = parseGlAccountCsv(csv)
    const preview = await buildImportPreview(
      prisma,
      parsed.rows,
      parsed.errors,
      parsed.warnings
    )
    const prepared = await prepareGlAccountImportApply(prisma, preview)

    const result = await applyGlAccountImport(
      tx as unknown as Prisma.TransactionClient,
      prepared
    )

    expect(result.inserted).toBe(2)
    expect(state.accounts.find((a) => a.code === "1100")?.parentId).toBe(
      state.accounts.find((a) => a.code === "1000")?.id
    )
    expect(findUniqueSpy).not.toHaveBeenCalled()
    findUniqueSpy.mockRestore()
  })
})
