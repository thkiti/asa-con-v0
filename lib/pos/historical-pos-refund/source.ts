import { Prisma } from "@/generated/prisma/client"
import { buildPosVatEconomics } from "@/lib/finance/pos-sale-vat"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import { formatShopBranchCode } from "@/lib/import/validation/branch-code"
import {
  combineLegacySaleDateTime,
  parseLegacySaleDate,
} from "@/lib/import/legacy-sales/normalize-row"
import { readDbfRecords } from "@/lib/import/parsers/dbf-reader"
import { basenameSourceFileName } from "@/lib/import/legacy-sales/path"
import {
  HISTORICAL_REFUND_OUTPUT_VAT_ACCOUNT,
  HISTORICAL_REFUND_TAX_CODE,
  HISTORICAL_REFUND_VAT_RATE_BPS,
} from "./constants"
import type {
  HistoricalRefundDocument,
  HistoricalRefundSourceLine,
} from "./types"

/** Exact refund marker: trimmed S_TRANS starts with R (not free-text). */
export function isLegacyRefundTransNo(raw: unknown): boolean {
  return String(raw ?? "").trim().startsWith("R")
}

export function buildHistoricalRefundDocumentKey(input: {
  sourceFileName: string
  legacyBranchId: string
  legacyRefundDate: string
  legacyTransNo: string
}): string {
  return [
    input.sourceFileName,
    input.legacyBranchId.trim(),
    input.legacyRefundDate,
    input.legacyTransNo.trim(),
  ].join("|")
}

export function buildStableHistoricalRefundNo(input: {
  branchCode: string
  legacyRefundDate: string
  legacyTransNo: string
}): string {
  const branch = String(input.branchCode ?? "").trim().toUpperCase()
  const ymd = input.legacyRefundDate.replace(/-/g, "")
  const trans = String(input.legacyTransNo ?? "").trim().toUpperCase()
  return `REF-H-${branch}-${ymd}-${trans}`
}

export function splitHistoricalRefundLineAmount(amountAbs: number | string) {
  return buildPosVatEconomics(amountAbs, {
    rateBps: HISTORICAL_REFUND_VAT_RATE_BPS,
    taxCode: HISTORICAL_REFUND_TAX_CODE,
    inclusive: true,
    outputVatAccountCode: HISTORICAL_REFUND_OUTPUT_VAT_ACCOUNT,
  })
}

/**
 * Line-level VAT: split each source line, then sum.
 * Do not split from document gross.
 */
export function aggregateLineLevelVat(
  lineAmountsAbs: Array<number | string>
): {
  gross: Prisma.Decimal
  net: Prisma.Decimal
  vat: Prisma.Decimal
  vatEconomics: ReturnType<typeof buildPosVatEconomics>
} {
  let gross = ZERO
  let net = ZERO
  let vat = ZERO
  for (const amount of lineAmountsAbs) {
    const split = splitHistoricalRefundLineAmount(amount)
    gross = addMoney(gross, split.gross)
    net = addMoney(net, split.net)
    vat = addMoney(vat, split.vat)
  }
  return {
    gross,
    net,
    vat,
    vatEconomics: {
      gross,
      net,
      vat,
      taxCode: HISTORICAL_REFUND_TAX_CODE,
      rateBps: HISTORICAL_REFUND_VAT_RATE_BPS,
      inclusive: true,
      outputVatAccountCode: HISTORICAL_REFUND_OUTPUT_VAT_ACCOUNT,
    },
  }
}

export function parseLegacyRefundSourceRecord(
  record: Record<string, unknown>,
  sourceRowNo: number
): HistoricalRefundSourceLine | null {
  if (!isLegacyRefundTransNo(record.S_TRANS)) return null

  const legacyDate = String(record.S_DATE ?? "").trim()
  const parsedDate = parseLegacySaleDate(legacyDate)
  if (!parsedDate) return null

  const legacyTime = String(record.S_TIME ?? "").trim()
  const refundAt = combineLegacySaleDateTime(legacyDate, legacyTime)
  if (!refundAt) return null

  const legacyBranchId = String(record.S_ID ?? "").trim()
  if (!legacyBranchId) return null

  const legacyTransNo = String(record.S_TRANS ?? "").trim()
  const amountSigned = Number(record.S_AMOUNT)
  if (!Number.isFinite(amountSigned)) return null

  const amountAbs = Math.abs(amountSigned)
  const qty = Math.trunc(Number(record.S_QTY))
  const staffRaw = String(record.E_ID ?? "").trim()

  return {
    sourceRowNo,
    legacyTransNo,
    legacyDate,
    legacyTime,
    legacyBranchId,
    legacyStaffId: staffRaw || null,
    legacyProductCode: String(record.I_ID ?? "").trim(),
    qty: Number.isFinite(qty) ? qty : 0,
    amountAbs,
    amountSigned,
    dateKey: parsedDate.dateKey,
    refundAt,
  }
}

export type LoadHistoricalRefundSourceResult = {
  sourceFilePath: string
  sourceFileName: string
  totalFileRows: number
  refundRows: HistoricalRefundSourceLine[]
}

export async function loadHistoricalRefundSourceRows(
  sourceFilePath: string,
  range: { fromDateKey: string; beforeDateKey: string }
): Promise<LoadHistoricalRefundSourceResult> {
  const records = await readDbfRecords(sourceFilePath)
  const refundRows: HistoricalRefundSourceLine[] = []

  for (let i = 0; i < records.length; i++) {
    const line = parseLegacyRefundSourceRecord(records[i] ?? {}, i + 1)
    if (!line) continue
    if (line.dateKey < range.fromDateKey || line.dateKey >= range.beforeDateKey) {
      continue
    }
    refundRows.push(line)
  }

  return {
    sourceFilePath,
    sourceFileName: basenameSourceFileName(sourceFilePath),
    totalFileRows: records.length,
    refundRows,
  }
}

export function groupHistoricalRefundDocuments(
  sourceFileName: string,
  rows: HistoricalRefundSourceLine[]
): Omit<
  HistoricalRefundDocument,
  "branchId" | "staffId" | "skipReason"
>[] {
  const groups = new Map<string, HistoricalRefundSourceLine[]>()

  for (const row of rows) {
    const key = buildHistoricalRefundDocumentKey({
      sourceFileName,
      legacyBranchId: row.legacyBranchId,
      legacyRefundDate: row.dateKey,
      legacyTransNo: row.legacyTransNo,
    })
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }

  const documents: Omit<
    HistoricalRefundDocument,
    "branchId" | "staffId" | "skipReason"
  >[] = []

  for (const [, lines] of [...groups.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const first = lines[0]!
    const economics = aggregateLineLevelVat(lines.map((l) => l.amountAbs))
    const staffIds = [
      ...new Set(lines.map((l) => l.legacyStaffId).filter(Boolean)),
    ] as string[]
    const branchCode = formatShopBranchCode(first.legacyBranchId)

    documents.push({
      key: buildHistoricalRefundDocumentKey({
        sourceFileName,
        legacyBranchId: first.legacyBranchId,
        legacyRefundDate: first.dateKey,
        legacyTransNo: first.legacyTransNo,
      }),
      sourceFileName,
      legacyBranchId: first.legacyBranchId,
      legacyTransNo: first.legacyTransNo,
      legacyRefundDate: first.dateKey,
      legacyRefundTime: first.legacyTime,
      refundAt: first.refundAt,
      branchCode,
      legacyStaffId: staffIds[0] ?? null,
      lines,
      sourceRowCount: lines.length,
      gross: economics.gross,
      net: economics.net,
      vat: economics.vat,
      vatEconomics: economics.vatEconomics,
    })
  }

  return documents
}

export function moneyEquals(
  left: Prisma.Decimal | string | number,
  right: Prisma.Decimal | string | number,
  tolerance = toMoney("0.02")
): boolean {
  return toMoney(left).minus(toMoney(right)).abs().lte(tolerance)
}
