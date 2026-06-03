import { createEmptyPhaseReport } from "../report"
import {
  flushImportPendingWrites,
  type ImportPendingWrite,
} from "../flush-pending-writes"
import type { BranchImportRow, ImportDb, ImportPhaseReport, ImportProfile } from "../types"

export async function runHoManifestImport(input: {
  db: ImportDb
  profile: ImportProfile
  apply: boolean
}): Promise<ImportPhaseReport> {
  const report = createEmptyPhaseReport("ho-manifest")
  const row: BranchImportRow = {
    code: input.profile.hoBranch.code,
    name: input.profile.hoBranch.name,
    type: input.profile.hoBranch.type,
    isActive: true,
    deleted: false,
  }

  report.rowsRead = 1
  report.sampleRows = [row]

  const existing = await input.db.branch.findUnique({
    where: { code: row.code },
    select: { id: true, name: true, type: true, isActive: true, deleted: true },
  })

  const pending: ImportPendingWrite[] = []

  if (!existing) {
    report.wouldInsert++
    if (input.apply) {
      pending.push(async () => {
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
      })
    }
    await flushImportPendingWrites(report, input.apply, pending)
    return report
  }

  const needsUpdate =
    existing.name !== row.name ||
    existing.type !== row.type ||
    existing.isActive !== row.isActive ||
    existing.deleted !== row.deleted

  if (needsUpdate) {
    report.wouldUpdate++
    if (input.apply) {
      pending.push(async () => {
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
      })
    }
    await flushImportPendingWrites(report, input.apply, pending)
    return report
  }

  report.skipped++
  await flushImportPendingWrites(report, input.apply, pending)
  return report
}
