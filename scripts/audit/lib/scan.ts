import fs from "fs"
import path from "path"
import type { AuditResult, AuditRule, Violation } from "./types"
import { getRepoRoot, isPathAllowed, normalizeRelativePath } from "./paths"

function lineNumberAt(source: string, index: number): number {
  return source.slice(0, index).split("\n").length
}

export function scanForbiddenPatterns(
  source: string,
  pattern: RegExp,
  ruleId: string,
  file = "<string>"
): Violation[] {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`
  const re = new RegExp(pattern.source, flags)
  const violations: Violation[] = []
  let match: RegExpExecArray | null

  while ((match = re.exec(source)) !== null) {
    violations.push({
      ruleId,
      file,
      line: lineNumberAt(source, match.index),
      match: match[0],
    })
  }

  return violations
}

export function scanFile(
  filePath: string,
  pattern: RegExp,
  ruleId: string,
  repoRoot?: string
): Violation[] {
  const root = repoRoot ?? getRepoRoot()
  const source = fs.readFileSync(filePath, "utf8")
  const rel = normalizeRelativePath(filePath, root)
  return scanForbiddenPatterns(source, pattern, ruleId, rel)
}

export function scanFiles(
  name: string,
  files: string[],
  rules: AuditRule[],
  repoRoot?: string
): AuditResult {
  const root = repoRoot ?? getRepoRoot()
  const violations: Violation[] = []

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, "utf8")
    const rel = normalizeRelativePath(filePath, root)

    for (const rule of rules) {
      if (
        rule.allowedRelativePaths?.length &&
        isPathAllowed(rel, rule.allowedRelativePaths)
      ) {
        continue
      }

      const hits = scanForbiddenPatterns(source, rule.pattern, rule.id, rel)
      for (const hit of hits) {
        violations.push({
          ...hit,
          message: rule.message ?? hit.message,
        })
      }
    }
  }

  return {
    name,
    passed: violations.length === 0,
    violations,
    filesScanned: files.length,
  }
}

export function printAuditResult(result: AuditResult): void {
  const status = result.passed ? "PASS" : "FAIL"
  console.log(`[${status}] ${result.name} (${result.filesScanned} files)`)

  for (const v of result.violations) {
    const loc = v.line != null ? `${v.file}:${v.line}` : v.file
    const detail = v.match ? ` — ${JSON.stringify(v.match)}` : ""
    const msg = v.message ? ` (${v.message})` : ""
    console.log(`  ${v.ruleId} @ ${loc}${detail}${msg}`)
  }
}

export interface RunAuditsOptions {
  exitOnFail?: boolean
}

export function runAudits(
  audits: () => AuditResult[],
  options?: RunAuditsOptions
): boolean {
  const results = audits()
  let allPassed = true

  for (const result of results) {
    printAuditResult(result)
    if (!result.passed) allPassed = false
  }

  const passedCount = results.filter((r) => r.passed).length
  console.log("")
  console.log("--- Summary ---")
  console.log(`${passedCount}/${results.length} audits passed`)

  if (!allPassed && options?.exitOnFail) {
    process.exit(1)
  }

  return allPassed
}
