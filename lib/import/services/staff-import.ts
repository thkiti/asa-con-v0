import type { Role } from "@/generated/prisma/client"

import {
  STAFF_BOOTSTRAP_ADMIN_EXISTS_WARNING,
  STAFF_BOOTSTRAP_ADMIN_ID,
  STAFF_BOOTSTRAP_MAPPING_WARNING,
} from "../constants"
import {
  createEmptyPhaseReport,
  takeSampleRows,
} from "../report"
import { parseStaffDbf, resolveStaffDbfPath } from "../parsers/staff-dbf"
import { getDefaultStaffPasswordHash } from "../staff-password"
import {
  bootstrapBranchErrorMessage,
  validateBootstrapBranches,
} from "./bootstrap-branches"
import type { ImportDb, ImportPhaseReport, ImportProfile, StaffImportRow } from "../types"

function isBootstrapAdmin(staffId: string): boolean {
  return staffId === STAFF_BOOTSTRAP_ADMIN_ID
}

function staffNeedsUpdate(
  existing: {
    name?: string
    role?: Role
    branchId?: string
    deleted?: boolean
  },
  row: StaffImportRow,
  branchId: string
): boolean {
  return (
    existing.name !== row.name ||
    existing.role !== row.role ||
    existing.branchId !== branchId ||
    existing.deleted !== row.deleted
  )
}

function bootstrapAdminSafeUpdateNeeded(
  existing: {
    name?: string
    role?: Role
    branchId?: string
    deleted?: boolean
  },
  row: StaffImportRow,
  branchId: string
): boolean {
  return (
    existing.name !== row.name ||
    existing.role !== "HO_ADMIN" ||
    existing.branchId !== branchId ||
    existing.deleted !== false
  )
}

export async function runStaffImport(input: {
  db: ImportDb
  profile: ImportProfile
  apply: boolean
}): Promise<ImportPhaseReport> {
  const report = createEmptyPhaseReport("staff")
  report.warnings.push(STAFF_BOOTSTRAP_MAPPING_WARNING)

  const bootstrap = await validateBootstrapBranches(input.db)
  if (bootstrap.missingCodes.length > 0) {
    report.errors.push(bootstrapBranchErrorMessage(bootstrap.missingCodes))
    return report
  }

  const filePath = resolveStaffDbfPath(input.profile.sourceDir, input.profile.staffFile)
  const parsed = await parseStaffDbf(filePath)

  report.rowsRead = parsed.rows.length + parsed.skipped
  report.skipped = parsed.skipped
  report.errors.push(...parsed.errors)
  report.sampleRows = takeSampleRows(parsed.rows)

  const passwordHash = input.apply ? await getDefaultStaffPasswordHash() : null

  for (const row of parsed.rows) {
    const branch = bootstrap.branches[row.branchCode]
    if (!branch) {
      report.skipped++
      report.errors.push(`Branch not found for staff ${row.staffId}: ${row.branchCode}`)
      continue
    }

    const existing = await input.db.staff.findUnique({
      where: { staffId: row.staffId },
      select: { id: true, name: true, role: true, branchId: true, deleted: true },
    })

    if (!existing) {
      report.wouldInsert++
      if (input.apply && passwordHash) {
        await input.db.staff.upsert({
          where: { staffId: row.staffId },
          create: {
            staffId: row.staffId,
            name: row.name,
            role: row.role,
            branchId: branch.id,
            password: passwordHash,
            deleted: row.deleted,
          },
          update: {
            name: row.name,
            role: row.role,
            branchId: branch.id,
            password: passwordHash,
            deleted: row.deleted,
          },
        })
        report.inserted++
      }
      continue
    }

    if (isBootstrapAdmin(row.staffId)) {
      if (bootstrapAdminSafeUpdateNeeded(existing, row, branch.id)) {
        report.wouldUpdate++
        report.warnings.push(STAFF_BOOTSTRAP_ADMIN_EXISTS_WARNING)
        if (input.apply) {
          await input.db.staff.upsert({
            where: { staffId: row.staffId },
            create: {
              staffId: row.staffId,
              name: row.name,
              role: "HO_ADMIN",
              branchId: branch.id,
              password: passwordHash!,
              deleted: false,
            },
            update: {
              name: row.name,
              role: "HO_ADMIN",
              branchId: branch.id,
              deleted: false,
            },
          })
          report.updated++
        }
      } else {
        report.skipped++
        report.warnings.push(STAFF_BOOTSTRAP_ADMIN_EXISTS_WARNING)
      }
      continue
    }

    if (staffNeedsUpdate(existing, row, branch.id)) {
      report.wouldUpdate++
      if (input.apply && passwordHash) {
        await input.db.staff.upsert({
          where: { staffId: row.staffId },
          create: {
            staffId: row.staffId,
            name: row.name,
            role: row.role,
            branchId: branch.id,
            password: passwordHash,
            deleted: row.deleted,
          },
          update: {
            name: row.name,
            role: row.role,
            branchId: branch.id,
            password: passwordHash,
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
