export type ImportEntityKey = "branch" | "product" | "reference-stock" | "staff"

export type ImportMode = "dry-run" | "apply"

export type ImportArchiveFileView = {
  filename: string
  importRole: string
  required: boolean
  exists: boolean
  sha256: string | null
  sizeBytes: number | null
}

export type ImportArchiveStatusView = {
  archiveRoot: string
  manifestPresent: boolean
  files: ImportArchiveFileView[]
  warnings: string[]
}

export type ImportReportListItemView = {
  reportId: string
  entity: ImportEntityKey | null
  mode: ImportMode
  profile: string
  startedAt: string
  mtimeMs: number
}

export type ImportPhaseReportView = {
  phase: string
  rowsRead: number
  wouldInsert: number
  wouldUpdate: number
  skipped: number
  inserted: number
  updated: number
  errors: string[]
  warnings: string[]
  missingProductReferences: string[]
  sampleRows: unknown[]
}

export type ImportReportTotalsView = {
  rowsRead: number
  wouldInsert: number
  wouldUpdate: number
  skipped: number
  inserted: number
  updated: number
  errors: number
  warnings: number
  missingProductReferences: number
}

export type ImportReportMetaView = {
  entity: ImportEntityKey
  reportId: string
  archiveRoot: string
  sourceChecksums: Record<string, string>
}

export type ImportReportView = {
  profile: string
  mode: ImportMode
  sourceDir: string
  startedAt: string
  completedAt: string
  phases: ImportPhaseReportView[]
  totals: ImportReportTotalsView
  meta?: ImportReportMetaView
}

export type ImportStatusResponse = {
  archive: ImportArchiveStatusView
  latestReports: ImportReportListItemView[]
  staffBootstrap: StaffBootstrapStatusView
  productionGuardActive: boolean
  importAllowProduction: boolean
}

export type StaffBootstrapStatusView = {
  importedStaffCount: number
  hasBootstrapAdmin: boolean
}

export type ImportReportsResponse = {
  reports: ImportReportListItemView[]
}

export type LogoutResponse = {
  redirectTo: string
}
