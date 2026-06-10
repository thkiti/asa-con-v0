import { GlAccountType } from "@/generated/prisma/client"
import { parseGlAccountCsv } from "@/lib/finance/gl-account-csv-parser"
import { exportGlAccountsCsv } from "@/lib/finance/gl-account-export"
import type { GlAccountListRow } from "@/lib/finance/gl-account-list"

const rows: GlAccountListRow[] = [
  {
    id: "1",
    code: "1000",
    name: "Assets",
    accountType: GlAccountType.ASSET,
    parentId: null,
    parentCode: null,
    parentName: null,
    isActive: true,
    deleted: false,
    hasJournalLines: false,
    childCount: 1,
  },
  {
    id: "2",
    code: "1100",
    name: "Cash",
    accountType: GlAccountType.ASSET,
    parentId: "1",
    parentCode: "1000",
    parentName: "Assets",
    isActive: true,
    deleted: false,
    hasJournalLines: true,
    childCount: 0,
  },
]

describe("exportGlAccountsCsv", () => {
  it("exports import-compatible CSV", async () => {
    const prisma = {
      glAccount: {
        findMany: async () =>
          rows.map((r) => ({
            ...r,
            parent: r.parentCode
              ? { code: r.parentCode, name: r.parentName ?? "" }
              : null,
            _count: { journalEntryLines: r.hasJournalLines ? 1 : 0, children: r.childCount },
          })),
      },
    }

    const csv = await exportGlAccountsCsv(prisma)
    expect(csv).toContain("accountCode,accountName,accountType,normalBalance")
    expect(csv).toContain("1100,Cash,ASSET,DEBIT,1000,true")

    const parsed = parseGlAccountCsv(csv)
    expect(parsed.errors).toHaveLength(0)
    expect(parsed.rows.length).toBeGreaterThanOrEqual(2)
  })
})
