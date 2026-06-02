import {
  createEmptyPhaseReport,
  takeSampleRows,
} from "../report"
import {
  parseBranchDbf,
  resolveBranchDbfPath,
} from "../parsers/branch-dbf"
import type { BranchImportRow, ImportDb, ImportPhaseReport, ImportProfile } from "../types"

function branchNeedsUpdate(
  existing: {
    name?: string
    type?: BranchImportRow["type"]
    isActive?: boolean
    deleted?: boolean
  },
  row: BranchImportRow
): boolean {
  return (
    existing.name !== row.name ||
    existing.type !== row.type ||
    existing.isActive !== row.isActive ||
    existing.deleted !== row.deleted
  )
}

export async function runBranchImport(input: {
  db: ImportDb
  profile: ImportProfile
  apply: boolean
}): Promise<ImportPhaseReport> {
  const report = createEmptyPhaseReport("branch")
  const filePath = resolveBranchDbfPath(input.profile.sourceDir, input.profile.branchFile)
  const parsed = await parseBranchDbf(filePath)

  report.rowsRead = parsed.rows.length + parsed.skipped
  report.skipped = parsed.skipped
  report.errors.push(...parsed.errors)
  report.sampleRows = takeSampleRows(parsed.rows)

  for (const row of parsed.rows) {
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

    if (branchNeedsUpdate(existing, row)) {
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
