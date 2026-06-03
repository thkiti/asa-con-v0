import type { ImportPhaseReport } from "./types"

export type ImportPendingWrite = () => Promise<void>

/** Skip all apply writes when phase has blocking validation errors. */
export function hasBlockingImportErrors(report: ImportPhaseReport): boolean {
  return report.errors.length > 0
}

export async function flushImportPendingWrites(
  report: ImportPhaseReport,
  apply: boolean,
  pending: ImportPendingWrite[]
): Promise<void> {
  if (!apply || pending.length === 0) return
  if (hasBlockingImportErrors(report)) return
  for (const write of pending) {
    await write()
  }
}
