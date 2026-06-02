import {
  BOOTSTRAP_HO_BRANCH_CODE,
  BOOTSTRAP_SHOP_BRANCH_CODE,
} from "../constants"
import { createEmptyPhaseReport } from "../report"
import type { ImportDb, ImportPhaseReport, ImportProfile } from "../types"

export type BootstrapBranchValidation = {
  missingCodes: string[]
  branches: Record<string, { id: string; code: string; name: string } | null>
}

export async function validateBootstrapBranches(
  db: ImportDb
): Promise<BootstrapBranchValidation> {
  const codes = [BOOTSTRAP_HO_BRANCH_CODE, BOOTSTRAP_SHOP_BRANCH_CODE]
  const branches: BootstrapBranchValidation["branches"] = {}
  const missingCodes: string[] = []

  for (const code of codes) {
    const branch = await db.branch.findUnique({
      where: { code },
      select: { id: true, name: true, type: true, isActive: true, deleted: true },
    })

    if (!branch || branch.deleted === true || branch.isActive === false) {
      missingCodes.push(code)
      branches[code] = null
      continue
    }

    branches[code] = { id: branch.id, code, name: branch.name ?? code }
  }

  return { missingCodes, branches }
}

export async function runBootstrapBranchEnsure(input: {
  db: ImportDb
  profile: ImportProfile
  apply: boolean
}): Promise<ImportPhaseReport> {
  const report = createEmptyPhaseReport("bootstrap-branches")
  const rows = [
    {
      code: input.profile.hoBranch.code,
      name: input.profile.hoBranch.name,
      type: input.profile.hoBranch.type,
      isActive: true,
      deleted: false,
    },
    {
      code: input.profile.bootstrapShopBranch.code,
      name: input.profile.bootstrapShopBranch.name,
      type: input.profile.bootstrapShopBranch.type,
      isActive: true,
      deleted: false,
    },
  ]

  report.rowsRead = rows.length
  report.sampleRows = rows

  for (const row of rows) {
    const existing = await input.db.branch.findUnique({
      where: { code: row.code },
      select: { id: true, name: true, type: true, isActive: true, deleted: true },
    })

    if (!existing) {
      report.wouldInsert++
      if (input.apply) {
        await input.db.branch.upsert({
          where: { code: row.code },
          create: row,
          update: {
            name: row.name,
            type: row.type,
            isActive: row.isActive,
            deleted: row.deleted,
          },
        })
        report.inserted++
      }
      continue
    }

    const needsUpdate =
      existing.name !== row.name ||
      existing.type !== row.type ||
      existing.isActive !== row.isActive ||
      existing.deleted !== row.deleted

    if (needsUpdate) {
      report.wouldUpdate++
      if (input.apply) {
        await input.db.branch.upsert({
          where: { code: row.code },
          create: row,
          update: {
            name: row.name,
            type: row.type,
            isActive: row.isActive,
            deleted: row.deleted,
          },
        })
        report.updated++
      }
      continue
    }

    report.skipped++
  }

  return report
}

export function bootstrapBranchErrorMessage(missingCodes: string[]): string {
  return `Bootstrap branches missing or inactive: ${missingCodes.join(", ")}`
}
