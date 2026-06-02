import path from "path"

import {
  DEVBOARD_V1_ARCHIVE_NAME,
  DEVBOARD_V1_LEGACY_FILES,
  getLegacyArchiveSubdir,
} from "./catalog"
import {
  copyFilePreserveName,
  ensureArchiveDirectories,
  fileSizeBytes,
  pathExists,
  pathExistsSync,
  sha256File,
  writeJsonFile,
} from "./io"
import type {
  LegacyArchiveFileEntry,
  LegacyArchiveManifest,
  LegacyArchiveOptions,
  LegacyArchiveResult,
} from "./types"

function resolveSourcePath(sourceRoot: string, specFilename: string, category: string): string {
  const flatPath = path.join(sourceRoot, specFilename)
  const categorizedPath = path.join(sourceRoot, category, specFilename)
  return pathExistsSync(categorizedPath) ? categorizedPath : flatPath
}

function resolveArchivePath(targetRoot: string, category: string, filename: string): string {
  return path.join(targetRoot, getLegacyArchiveSubdir(category as "dbf" | "csv" | "other"), filename)
}

export async function buildLegacyArchiveManifest(
  options: LegacyArchiveOptions
): Promise<LegacyArchiveResult> {
  const sourceRoot = path.resolve(options.sourceDir)
  const targetRoot = path.resolve(options.targetDir)
  const archiveName = options.archiveName ?? DEVBOARD_V1_ARCHIVE_NAME
  const dryRun = options.dryRun ?? false
  const createdAt = new Date().toISOString()

  const warnings: string[] = []
  const errors: string[] = []
  const files: LegacyArchiveFileEntry[] = []
  let copiedCount = 0

  if (!dryRun) {
    await ensureArchiveDirectories(targetRoot)
  }

  for (const spec of DEVBOARD_V1_LEGACY_FILES) {
    const sourcePath = resolveSourcePath(sourceRoot, spec.filename, spec.category)
    const archivePath = resolveArchivePath(targetRoot, spec.category, spec.filename)
    const sourceExists = await pathExists(sourcePath)

    if (!sourceExists) {
      if (spec.required) {
        errors.push(`Missing required source file: ${spec.filename}`)
      } else {
        warnings.push(`Optional source file missing, skipped: ${spec.filename}`)
      }

      files.push({
        filename: spec.filename,
        category: spec.category,
        importRole: spec.importRole,
        required: spec.required,
        exists: false,
        sourcePath,
        archivePath,
        sizeBytes: null,
        sha256: null,
        encoding: spec.encoding,
        copiedAt: null,
        notes: spec.notes,
      })
      continue
    }

    const sizeBytes = await fileSizeBytes(sourcePath)
    let sha256: string | null = null
    let copiedAt: string | null = null

    if (!dryRun) {
      await copyFilePreserveName(sourcePath, archivePath)
      sha256 = await sha256File(archivePath)
      copiedAt = new Date().toISOString()
      copiedCount++
    } else {
      sha256 = await sha256File(sourcePath)
    }

    files.push({
      filename: spec.filename,
      category: spec.category,
      importRole: spec.importRole,
      required: spec.required,
      exists: true,
      sourcePath,
      archivePath,
      sizeBytes,
      sha256,
      encoding: spec.encoding,
      copiedAt,
      notes: spec.notes,
    })
  }

  const manifest: LegacyArchiveManifest = {
    archiveName,
    createdAt,
    sourceRoot,
    targetRoot,
    files,
  }

  if (!dryRun) {
    await writeJsonFile(path.join(targetRoot, "manifest.json"), manifest)
  }

  return { manifest, warnings, errors, copiedCount }
}

export function summarizeLegacyArchiveManifest(manifest: LegacyArchiveManifest): {
  totalFiles: number
  presentFiles: number
  missingRequired: string[]
  missingOptional: string[]
} {
  const missingRequired = manifest.files
    .filter((file) => file.required && !file.exists)
    .map((file) => file.filename)
  const missingOptional = manifest.files
    .filter((file) => !file.required && !file.exists)
    .map((file) => file.filename)

  return {
    totalFiles: manifest.files.length,
    presentFiles: manifest.files.filter((file) => file.exists).length,
    missingRequired,
    missingOptional,
  }
}

export function printLegacyArchiveSummary(result: LegacyArchiveResult, dryRun: boolean): void {
  const summary = summarizeLegacyArchiveManifest(result.manifest)

  console.log("")
  console.log(`Legacy archive: ${result.manifest.archiveName}`)
  console.log(`Mode: ${dryRun ? "dry-run" : "apply"}`)
  console.log(`Source: ${result.manifest.sourceRoot}`)
  console.log(`Target: ${result.manifest.targetRoot}`)
  console.log(`Files cataloged: ${summary.totalFiles}`)
  console.log(`Files present: ${summary.presentFiles}`)
  if (!dryRun) {
    console.log(`Files copied: ${result.copiedCount}`)
  }

  if (result.warnings.length > 0) {
    console.log("Warnings:")
    for (const warning of result.warnings) {
      console.log(`  - ${warning}`)
    }
  }

  if (result.errors.length > 0) {
    console.log("Errors:")
    for (const error of result.errors) {
      console.log(`  - ${error}`)
    }
  }

  console.log("")
  console.log("Manifest entries:")
  for (const file of result.manifest.files) {
    console.log(
      `  ${file.filename} [${file.importRole}] exists=${file.exists} size=${file.sizeBytes ?? "n/a"} sha256=${file.sha256?.slice(0, 12) ?? "n/a"}...`
    )
  }
}

export function parseLegacyArchiveCliArgs(argv: string[]): LegacyArchiveOptions {
  const sourceArg = argv.find((arg) => arg.startsWith("--source-dir="))
  const targetArg = argv.find((arg) => arg.startsWith("--target-dir="))
  const archiveNameArg = argv.find((arg) => arg.startsWith("--archive-name="))

  return {
    sourceDir:
      sourceArg?.split("=")[1]?.trim() ||
      process.env.IMPORT_SOURCE_DIR?.trim() ||
      "D:/_projects/asa-con/scripts",
    targetDir: targetArg?.split("=")[1]?.trim() || "data/legacy/devboard-v1",
    archiveName: archiveNameArg?.split("=")[1]?.trim(),
    dryRun: argv.includes("--dry-run") || argv.includes("--list"),
  }
}
