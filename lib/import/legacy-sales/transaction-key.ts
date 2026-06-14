import { parseLegacySaleDate } from "./normalize-row"

/** Transaction identity within one legacy file — branch + calendar date + S_TRANS. */
export function buildLegacyTransactionKey(input: {
  legacyBranchId: string
  legacyDate: string
  legacyTransNo: string
}): string {
  const parsed = parseLegacySaleDate(input.legacyDate)
  const dateKey = parsed?.dateKey ?? input.legacyDate.trim()
  return `${input.legacyBranchId.trim()}|${dateKey}|${input.legacyTransNo.trim()}`
}

export function buildLegacySaleReferenceKey(input: {
  sourceFileName: string
  legacyBranchId: string
  legacySaleDate: string
  legacyTransNo: string
}): string {
  return `${input.sourceFileName}|${input.legacyBranchId.trim()}|${input.legacySaleDate}|${input.legacyTransNo.trim()}`
}
