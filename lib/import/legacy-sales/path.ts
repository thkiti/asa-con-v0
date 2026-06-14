import fs from "fs"
import path from "path"

import { resolveImportSourceDir } from "@/lib/import/profiles/devboard-v1"
import { resolveImportSourceFile } from "@/lib/import/source-paths"
import { LEGACY_SALES_DEFAULT_FILE } from "./constants"

export function resolveLegacySalesDbfPath(options: {
  file?: string
  sourceDir?: string
}): string {
  const fileArg = options.file?.trim()
  if (fileArg && path.isAbsolute(fileArg)) {
    return fileArg
  }

  const fileName = fileArg || LEGACY_SALES_DEFAULT_FILE
  const sourceDir =
    options.sourceDir?.trim() ||
    process.env.LEGACY_SALES_SOURCE_DIR?.trim() ||
    resolveImportSourceDir()

  return resolveImportSourceFile(sourceDir, fileName, "dbf")
}

export function assertLegacySalesFileExists(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Legacy sales DBF not found: ${filePath}`)
  }
}

export function basenameSourceFileName(filePath: string): string {
  return path.basename(filePath)
}
