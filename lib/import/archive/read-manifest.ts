import fs from "fs/promises"
import path from "path"

import { DEVBOARD_V1_LEGACY_FILES } from "./catalog"
import { sha256File } from "./io"
import type { LegacyArchiveManifest } from "./types"
import { resolveImportSourceFile } from "../source-paths"

const DEFAULT_ARCHIVE_ROOT = path.resolve("data/legacy/devboard-v1")

export async function readLegacyArchiveManifest(
  archiveRoot = DEFAULT_ARCHIVE_ROOT
): Promise<LegacyArchiveManifest | null> {
  const manifestPath = path.join(archiveRoot, "manifest.json")
  try {
    const raw = await fs.readFile(manifestPath, "utf8")
    return JSON.parse(raw) as LegacyArchiveManifest
  } catch {
    return null
  }
}

export async function collectSourceChecksums(sourceDir: string): Promise<Record<string, string>> {
  const checksums: Record<string, string> = {}

  for (const spec of DEVBOARD_V1_LEGACY_FILES) {
    const category = spec.category === "other" ? "dbf" : spec.category
    const filePath = resolveImportSourceFile(sourceDir, spec.filename, category)
    try {
      checksums[spec.filename] = await sha256File(filePath)
    } catch {
      // missing optional/required files omitted; apply gate validates required at dry-run time
    }
  }

  return checksums
}

export function summarizeArchiveStatus(manifest: LegacyArchiveManifest | null): {
  archiveRoot: string
  manifestPresent: boolean
  files: Array<{
    filename: string
    importRole: string
    required: boolean
    exists: boolean
    sha256: string | null
    sizeBytes: number | null
  }>
  warnings: string[]
} {
  if (!manifest) {
    return {
      archiveRoot: DEFAULT_ARCHIVE_ROOT,
      manifestPresent: false,
      files: [],
      warnings: ["manifest.json not found — run archive script or verify data/legacy/devboard-v1"],
    }
  }

  const warnings: string[] = []
  for (const file of manifest.files) {
    if (!file.required && !file.exists) {
      warnings.push(`Optional file missing: ${file.filename}`)
    }
  }

  return {
    archiveRoot: manifest.targetRoot,
    manifestPresent: true,
    files: manifest.files.map((file) => ({
      filename: file.filename,
      importRole: file.importRole,
      required: file.required,
      exists: file.exists,
      sha256: file.sha256,
      sizeBytes: file.sizeBytes,
    })),
    warnings,
  }
}
