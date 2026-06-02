import fs from "fs/promises"
import path from "path"

import type { ImportEntity, ImportReport } from "./types"

const REPORT_DIR = path.join(process.cwd(), "tmp", "import-reports")

export function buildImportReportId(report: ImportReport, entity: ImportEntity): string {
  const stamp = report.startedAt.replace(/[:.]/g, "-")
  return `${report.profile}-${report.mode}-${entity}-${stamp}.json`
}

export async function writePhaseImportReport(
  report: ImportReport,
  entity: ImportEntity
): Promise<{ reportId: string; filePath: string }> {
  await fs.mkdir(REPORT_DIR, { recursive: true })
  const reportId = buildImportReportId(report, entity)
  const filePath = path.join(REPORT_DIR, reportId)
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), "utf8")
  return { reportId, filePath }
}

export type ImportReportListItem = {
  reportId: string
  entity: ImportEntity | null
  mode: ImportReport["mode"]
  profile: string
  startedAt: string
  mtimeMs: number
}

function parseReportFilename(fileName: string): ImportReportListItem | null {
  const match = fileName.match(
    /^(.+)-(dry-run|apply)-(branch|product|reference-stock|staff)-(.+)\.json$/
  )
  if (!match) return null

  return {
    reportId: fileName,
    profile: match[1],
    mode: match[2] as ImportReport["mode"],
    entity: match[3] as ImportEntity,
    startedAt: match[4].replace(/-/g, (value, index) => {
      if (index <= 9) return value
      if (index === 10) return ":"
      if (index === 13) return ":"
      if (index === 16) return "."
      return value
    }),
    mtimeMs: 0,
  }
}

export async function listImportReports(filter?: {
  entity?: ImportEntity
  mode?: ImportReport["mode"]
  limit?: number
}): Promise<ImportReportListItem[]> {
  let entries: ImportReportListItem[] = []

  try {
    const files = await fs.readdir(REPORT_DIR)
    for (const fileName of files) {
      const parsed = parseReportFilename(fileName)
      if (!parsed) continue
      if (filter?.entity && parsed.entity !== filter.entity) continue
      if (filter?.mode && parsed.mode !== filter.mode) continue
      const stat = await fs.stat(path.join(REPORT_DIR, fileName))
      entries.push({ ...parsed, mtimeMs: stat.mtimeMs })
    }
  } catch {
    return []
  }

  entries.sort((a, b) => b.mtimeMs - a.mtimeMs)
  const limit = filter?.limit ?? 20
  return entries.slice(0, limit)
}

export async function readImportReport(reportId: string): Promise<ImportReport | null> {
  const safeName = path.basename(reportId)
  const filePath = path.join(REPORT_DIR, safeName)
  try {
    const raw = await fs.readFile(filePath, "utf8")
    return JSON.parse(raw) as ImportReport
  } catch {
    return null
  }
}

export async function findLatestDryRunReport(
  entity: ImportEntity,
  profile: string
): Promise<ImportReport | null> {
  const items = await listImportReports({ entity, mode: "dry-run", limit: 50 })
  for (const item of items) {
    if (item.profile !== profile) continue
    const report = await readImportReport(item.reportId)
    if (report?.meta?.entity === entity) return report
  }
  return null
}
