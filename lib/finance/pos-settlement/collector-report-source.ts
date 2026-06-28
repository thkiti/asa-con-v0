import type { ReadReportMode, ReadReportPayload } from "@/lib/pos/read-report-types"

export function parseCollectorReportPayload(
  reportJson: unknown
): ReadReportPayload | null {
  if (reportJson == null || typeof reportJson !== "object") {
    return null
  }
  return reportJson as ReadReportPayload
}

export function isCollectModeCollectorReport(reportJson: unknown): boolean {
  const report = parseCollectorReportPayload(reportJson)
  return report?.mode === "COLLECT"
}

export function collectorReportMode(
  reportJson: unknown
): ReadReportMode | null {
  return parseCollectorReportPayload(reportJson)?.mode ?? null
}
