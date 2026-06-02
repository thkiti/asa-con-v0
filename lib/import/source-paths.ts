import fs from "fs"
import path from "path"

export type ImportSourceCategory = "dbf" | "csv"

export function resolveImportSourceFile(
  sourceDir: string,
  fileName: string,
  category: ImportSourceCategory
): string {
  const categorizedPath = path.join(sourceDir, category, fileName)
  if (fs.existsSync(categorizedPath)) {
    return categorizedPath
  }

  return path.join(sourceDir, fileName)
}
