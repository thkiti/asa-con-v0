import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import { fetchPosCollectReport } from "@/lib/pos-ui/read-report-client"
import { printCollectorTicket } from "@/lib/pos-ui/print-collector-ticket"
import { printThermalSlipClone, thermalPrintSourceSelector } from "@/lib/thermal/print-dom"

export function canPrintPosReadReport(
  report: ReadReportPayload | null
): report is ReadReportPayload {
  return report?.mode === "Z" || report?.mode === "COLLECT"
}

/** Print the on-screen report payload — no fetch, no recompute. */
export function printPosReadReport(report: ReadReportPayload | null): boolean {
  if (!canPrintPosReadReport(report)) return false
  if (report.mode === "COLLECT") {
    return printCollectorTicket(report)
  }
  return printThermalSlipClone(thermalPrintSourceSelector("read-z"))
}

/** READ Z end-of-day: print thermal slip then close the report overlay. */
export function printReadZReportAndExit(
  report: ReadReportPayload | null,
  onExit: () => void
): boolean {
  if (!report || report.mode !== "Z") return false
  if (!printPosReadReport(report)) return false
  onExit()
  return true
}

export type CollectReportCommitInput = {
  staffId: string
  password: string
  dateFrom: string
  dateTo: string
}

export type PrintCollectorReportResult =
  | { ok: true }
  | { ok: false; error: string; phase: "save" | "print" }

async function waitForDomPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
}

/**
 * COLLECTOR end-of-flow: persist report, refresh on-screen slip, print ticket, then close overlay.
 */
export async function printCollectorReportAndExit(
  commit: CollectReportCommitInput,
  onExit: () => void,
  onReportSaved?: (report: ReadReportPayload) => void | Promise<void>
): Promise<PrintCollectorReportResult> {
  const saved = await fetchPosCollectReport({ ...commit, persist: true })
  if (!saved.ok) {
    return { ok: false, error: saved.error, phase: "save" }
  }
  await onReportSaved?.(saved.report)
  await waitForDomPaint()
  if (!printPosReadReport(saved.report)) {
    return { ok: false, error: "พิมพ์ตั๋ว Collector ไม่สำเร็จ", phase: "print" }
  }
  onExit()
  return { ok: true }
}

/** @deprecated READ Z now uses thermal clone print */
export const POS_READ_REPORT_PRINT_STYLES = ""
