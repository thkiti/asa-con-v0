import type {
  ManualJournalEntryStatus,
  ManualJournalEntryType,
} from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { LEGAL_ENTITY_CODES } from "@/lib/legal-entity/constants"
import type { ManualJournalEntryListFilter } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read-types"

function parseEnumValue<T extends string>(
  value: string | null,
  allowed: readonly T[]
): T | undefined {
  const raw = value?.trim().toUpperCase()
  if (!raw) return undefined
  return allowed.includes(raw as T) ? (raw as T) : undefined
}

export function parseManualJournalEntryListQuery(
  params: URLSearchParams
): ManualJournalEntryListFilter {
  const legalEntityRaw = params.get("legalEntityCode")?.trim().toUpperCase()
  const legalEntityCode = LEGAL_ENTITY_CODES.includes(
    legalEntityRaw as DocumentEntityCode
  )
    ? (legalEntityRaw as DocumentEntityCode)
    : undefined

  const status = parseEnumValue<ManualJournalEntryStatus>(
    params.get("status"),
    ["DRAFT", "SUBMITTED", "CONFIRMED", "POSTED", "CANCELLED"]
  )
  const entryType = parseEnumValue<ManualJournalEntryType>(
    params.get("entryType"),
    [
      "MANUAL",
      "OPENING_BALANCE",
      "ADJUSTMENT",
      "RECLASS",
      "ACCRUAL",
      "AUDITOR_ADJUSTMENT",
    ]
  )

  const branchId = params.get("branchId")?.trim() || undefined
  const entryNo = params.get("entryNo")?.trim() || undefined
  const postingStateRaw = params.get("postingState")?.trim().toLowerCase()
  const postingState =
    postingStateRaw === "posted" || postingStateRaw === "unposted"
      ? postingStateRaw
      : undefined
  const dateFrom = params.get("dateFrom")?.trim() || undefined
  const dateTo = params.get("dateTo")?.trim() || undefined

  const limitParam = params.get("limit")
  const offsetParam = params.get("offset")
  let limit: number | undefined
  let offset: number | undefined

  if (limitParam?.trim()) {
    const n = Number(limitParam.trim())
    if (Number.isFinite(n) && n > 0) limit = n
  }
  if (offsetParam?.trim()) {
    const n = Number(offsetParam.trim())
    if (Number.isFinite(n) && n >= 0) offset = n
  }

  return {
    legalEntityCode,
    status,
    entryType,
    branchId,
    entryNo,
    postingState,
    dateFrom,
    dateTo,
    limit,
    offset,
  }
}
