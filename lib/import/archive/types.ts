export type LegacyArchiveFileCategory = "dbf" | "csv" | "other"

export type LegacyArchiveImportRole =
  | "branch"
  | "product"
  | "staff"
  | "reference-stock"
  | "optional-reference-stock"
  | "other"

export type LegacyArchiveFileSpec = {
  filename: string
  category: LegacyArchiveFileCategory
  importRole: LegacyArchiveImportRole
  required: boolean
  encoding: string
  notes?: string
}

export type LegacyArchiveFileEntry = {
  filename: string
  category: LegacyArchiveFileCategory
  importRole: LegacyArchiveImportRole
  required: boolean
  exists: boolean
  sourcePath: string
  archivePath: string
  sizeBytes: number | null
  sha256: string | null
  encoding: string
  copiedAt: string | null
  notes?: string
}

export type LegacyArchiveManifest = {
  archiveName: string
  createdAt: string
  sourceRoot: string
  targetRoot: string
  files: LegacyArchiveFileEntry[]
}

export type LegacyArchiveOptions = {
  sourceDir: string
  targetDir: string
  archiveName?: string
  dryRun?: boolean
}

export type LegacyArchiveResult = {
  manifest: LegacyArchiveManifest
  warnings: string[]
  errors: string[]
  copiedCount: number
}
