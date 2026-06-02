import fs from "fs"

import { decodeTis620 } from "../tis620"
import type { StaffImportRow } from "../types"
import { resolveImportSourceFile } from "../source-paths"
import {
  BOOTSTRAP_HO_BRANCH_CODE,
  BOOTSTRAP_SHOP_BRANCH_CODE,
  STAFF_BOOTSTRAP_ADMIN_ID,
} from "../constants"
import { readDbfRecords } from "../parsers/dbf-reader"

type StaffParseResult = {
  rows: StaffImportRow[]
  skipped: number
  errors: string[]
}

export function mapStaffBootstrapRow(record: Record<string, unknown>): StaffImportRow | null {
  const staffId = decodeTis620(record.E_ID)
  if (!staffId) return null

  const firstName = decodeTis620(record.E_NAME)
  const lastName = decodeTis620(record.E_SURNAME)
  const name = `${firstName} ${lastName}`.trim()
  if (!name) return null

  const isAdmin = staffId === STAFF_BOOTSTRAP_ADMIN_ID

  return {
    staffId,
    name,
    role: isAdmin ? "HO_ADMIN" : "SH_STAFF",
    branchCode: isAdmin ? BOOTSTRAP_HO_BRANCH_CODE : BOOTSTRAP_SHOP_BRANCH_CODE,
    deleted: false,
  }
}

export async function parseStaffDbf(filePath: string): Promise<StaffParseResult> {
  if (!fs.existsSync(filePath)) {
    return {
      rows: [],
      skipped: 0,
      errors: [`Missing staff file: ${filePath}`],
    }
  }

  const records = await readDbfRecords(filePath)
  const rows: StaffImportRow[] = []
  const errors: string[] = []
  let skipped = 0

  for (let index = 0; index < records.length; index++) {
    try {
      const row = mapStaffBootstrapRow(records[index] ?? {})
      if (!row) {
        skipped++
        continue
      }
      rows.push(row)
    } catch (error) {
      skipped++
      errors.push(
        `Staff row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return { rows, skipped, errors }
}

export function resolveStaffDbfPath(sourceDir: string, fileName: string): string {
  return resolveImportSourceFile(sourceDir, fileName, "dbf")
}
