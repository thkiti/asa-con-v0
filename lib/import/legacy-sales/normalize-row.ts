import { normalizePosinyProductCode } from "@/lib/import/validation/product-code"
import { LEGACY_SALES_CUTOFF_DATE } from "./constants"
import type { ParsedLegacySalesDbfRow } from "./types"

export type ParsedLegacyDate = {
  dateKey: string
  year: number
  month: number
  day: number
}

export function parseLegacySaleDate(raw: unknown): ParsedLegacyDate | null {
  const text = String(raw ?? "").trim()
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null

  const day = Number.parseInt(match[1]!, 10)
  const month = Number.parseInt(match[2]!, 10)
  const year = Number.parseInt(match[3]!, 10)
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  const dateKey = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  return { dateKey, year, month, day }
}

export function parseLegacySaleTime(raw: unknown): {
  hours: number
  minutes: number
  seconds: number
} | null {
  const text = String(raw ?? "").trim()
  if (!text) {
    return { hours: 0, minutes: 0, seconds: 0 }
  }

  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null

  const hours = Number.parseInt(match[1]!, 10)
  const minutes = Number.parseInt(match[2]!, 10)
  const seconds = Number.parseInt(match[3] ?? "0", 10)
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    hours > 23 ||
    minutes > 59 ||
    seconds > 59
  ) {
    return null
  }

  return { hours, minutes, seconds }
}

export function combineLegacySaleDateTime(dateRaw: unknown, timeRaw: unknown): Date | null {
  const parsedDate = parseLegacySaleDate(dateRaw)
  if (!parsedDate) return null

  const parsedTime = parseLegacySaleTime(timeRaw)
  if (!parsedTime) return null

  return new Date(
    parsedDate.year,
    parsedDate.month - 1,
    parsedDate.day,
    parsedTime.hours,
    parsedTime.minutes,
    parsedTime.seconds,
    0
  )
}

export function isOnOrAfterCutoff(dateKey: string, cutoff = LEGACY_SALES_CUTOFF_DATE): boolean {
  return dateKey >= cutoff
}

function normalizeLegacyStaffId(raw: unknown): string | null {
  const value = String(raw ?? "").trim()
  return value || null
}

function normalizeLegacyBranchId(raw: unknown): string {
  return String(raw ?? "").trim()
}

function normalizeLegacyTransNo(raw: unknown): string {
  return String(raw ?? "").trim()
}

function normalizeQty(raw: unknown): number {
  return Math.trunc(Number(raw))
}

function normalizeAmount(raw: unknown): number {
  const value = Number(raw)
  return Number.isFinite(value) ? value : Number.NaN
}

export function normalizeLegacyProductCode(raw: unknown): string | null {
  const parts = normalizePosinyProductCode(raw)
  return parts?.code ?? null
}

export type NormalizeLegacySalesRowResult =
  | { ok: true; row: ParsedLegacySalesDbfRow }
  | { ok: false; reason: "OLD_DATA" | "INVALID_DATE" | "INVALID_TIME" | "INVALID_PRODUCT" | "INVALID_QTY" | "INVALID_AMOUNT" | "MISSING_BRANCH" | "MISSING_TRANS"; message: string }

export function normalizeLegacySalesDbfRecord(
  record: Record<string, unknown>,
  sourceRowNo: number
): NormalizeLegacySalesRowResult {
  const legacyDate = String(record.S_DATE ?? "").trim()
  const parsedDate = parseLegacySaleDate(legacyDate)
  if (!parsedDate) {
    return { ok: false, reason: "INVALID_DATE", message: `Invalid S_DATE: ${legacyDate}` }
  }

  if (!isOnOrAfterCutoff(parsedDate.dateKey)) {
    return { ok: false, reason: "OLD_DATA", message: `Before cutoff ${LEGACY_SALES_CUTOFF_DATE}` }
  }

  const legacyTime = String(record.S_TIME ?? "").trim()
  const normalizedSaleDateTime = combineLegacySaleDateTime(legacyDate, legacyTime)
  if (!normalizedSaleDateTime) {
    return { ok: false, reason: "INVALID_TIME", message: `Invalid S_TIME: ${legacyTime}` }
  }

  const legacyBranchId = normalizeLegacyBranchId(record.S_ID)
  if (!legacyBranchId) {
    return { ok: false, reason: "MISSING_BRANCH", message: "Missing S_ID" }
  }

  const legacyTransNo = normalizeLegacyTransNo(record.S_TRANS)
  if (!legacyTransNo) {
    return { ok: false, reason: "MISSING_TRANS", message: "Missing S_TRANS" }
  }

  const legacyProductCode = normalizeLegacyProductCode(record.I_ID)
  if (!legacyProductCode) {
    return { ok: false, reason: "INVALID_PRODUCT", message: `Invalid I_ID: ${String(record.I_ID ?? "")}` }
  }

  const qty = normalizeQty(record.S_QTY)
  if (!Number.isFinite(qty)) {
    return { ok: false, reason: "INVALID_QTY", message: "Invalid S_QTY" }
  }

  const amount = normalizeAmount(record.S_AMOUNT)
  if (!Number.isFinite(amount)) {
    return { ok: false, reason: "INVALID_AMOUNT", message: "Invalid S_AMOUNT" }
  }

  return {
    ok: true,
    row: {
      sourceRowNo,
      legacyTransNo,
      legacyDate,
      legacyTime,
      legacyBranchId,
      legacyStaffId: normalizeLegacyStaffId(record.E_ID),
      legacyProductCode,
      qty,
      amount,
      normalizedSaleDateTime,
      legacySaleDateKey: parsedDate.dateKey,
    },
  }
}
