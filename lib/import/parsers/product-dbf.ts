import fs from "fs"

import { resolveImportSourceFile } from "../source-paths"
import { decodeTis620 } from "../tis620"
import type { ProductImportRow } from "../types"
import { normalizePosinyProductCode } from "../validation/product-code"
import { readDbfRecords } from "./dbf-reader"

type ProductParseResult = {
  rows: ProductImportRow[]
  skipped: number
  errors: string[]
}

export async function parseProductDbf(filePath: string): Promise<ProductParseResult> {
  if (!fs.existsSync(filePath)) {
    return {
      rows: [],
      skipped: 0,
      errors: [`Missing product file: ${filePath}`],
    }
  }

  const records = await readDbfRecords(filePath)
  const rows: ProductImportRow[] = []
  const errors: string[] = []
  let skipped = 0

  for (let index = 0; index < records.length; index++) {
    try {
      const record = records[index]
      const parts = normalizePosinyProductCode(record.I_ID)
      const name = decodeTis620(record.I_THAIDESC)

      if (!parts || !name) {
        skipped++
        continue
      }

      rows.push({
        code: parts.code,
        groupCode: parts.groupCode,
        typeCode: parts.typeCode,
        runningCode: parts.runningCode,
        name,
        productType: "TRACKED",
        deleted: false,
      })
    } catch (error) {
      skipped++
      errors.push(
        `Product row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return { rows, skipped, errors }
}

export function resolveProductDbfPath(sourceDir: string, fileName: string): string {
  return resolveImportSourceFile(sourceDir, fileName, "dbf")
}
