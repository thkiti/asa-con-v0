export interface Violation {
  ruleId: string
  file: string
  line?: number
  match?: string
  message?: string
}

export interface AuditResult {
  name: string
  passed: boolean
  violations: Violation[]
  filesScanned: number
}

export interface AuditRule {
  id: string
  pattern: RegExp
  allowedRelativePaths?: string[]
  message?: string
}
