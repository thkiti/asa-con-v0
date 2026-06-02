import fs from "fs"

import { resolveImportSourceFile } from "../source-paths"
import { decodeTis620 } from "../tis620"
import type { BranchImportRow } from "../types"
import { formatShopBranchCode } from "../validation/branch-code"
import { readDbfRecords } from "./dbf-reader"

type BranchParseResult = {
  rows: BranchImportRow[]
  skipped: number
  errors: string[]
}

export async function parseBranchDbf(filePath: string): Promise<BranchParseResult> {
  if (!fs.existsSync(filePath)) {
    return {
      rows: [],
      skipped: 0,
      errors: [`Missing branch file: ${filePath}`],
    }
  }

  const records = await readDbfRecords(filePath)
  const rows: BranchImportRow[] = []
  const errors: string[] = []
  let skipped = 0

  for (let index = 0; index < records.length; index++) {
    try {
      const record = records[index]
      const code = formatShopBranchCode(record.S_ID)
      const name =
        decodeTis620(record.S_STOREBRN) || decodeTis620(record.S_STORENME)

      if (!code) {
        skipped++
        continue
      }

      if (!name) {
        skipped++
        continue
      }

      rows.push({
        code,
        name,
        type: "SH",
        isActive: true,
        deleted: false,
      })
    } catch (error) {
      skipped++
      errors.push(
        `Branch row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return { rows, skipped, errors }
}

export function resolveBranchDbfPath(sourceDir: string, fileName: string): string {
  return resolveImportSourceFile(sourceDir, fileName, "dbf")
}
