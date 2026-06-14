import type {
  ManualJournalEntryType,
} from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { LEGAL_ENTITY_CODES } from "@/lib/legal-entity/constants"
import type { ManualJournalSaveLineInput } from "@/lib/finance/manual-journal-entry/manual-journal-entry-types"

const ENTRY_TYPES: ManualJournalEntryType[] = [
  "MANUAL",
  "OPENING_BALANCE",
  "ADJUSTMENT",
  "RECLASS",
  "ACCRUAL",
  "AUDITOR_ADJUSTMENT",
]

export function parseManualJournalSaveLines(body: unknown): ManualJournalSaveLineInput[] {
  if (!Array.isArray(body)) {
    throw new Error("lines must be an array")
  }

  return body.map((row, index) => {
    if (!row || typeof row !== "object") {
      throw new Error(`lines[${index}] must be an object`)
    }
    const line = row as Record<string, unknown>
    const accountCode =
      line.accountCode != null ? String(line.accountCode).trim() : undefined
    const glAccountId =
      line.glAccountId != null ? String(line.glAccountId).trim() : undefined

    if (!accountCode && !glAccountId) {
      throw new Error(
        `lines[${index}]: accountCode or glAccountId is required`
      )
    }

    const debit =
      typeof line.debit === "string" || typeof line.debit === "number"
        ? line.debit
        : "0"
    const credit =
      typeof line.credit === "string" || typeof line.credit === "number"
        ? line.credit
        : "0"

    return {
      ...(accountCode ? { accountCode } : {}),
      ...(glAccountId ? { glAccountId } : {}),
      debit,
      credit,
      memo: line.memo != null ? String(line.memo) : null,
    }
  })
}

export function parseManualJournalEntryType(value: unknown): ManualJournalEntryType {
  const raw = String(value ?? "").trim().toUpperCase()
  if (!ENTRY_TYPES.includes(raw as ManualJournalEntryType)) {
    throw new Error("Invalid entryType")
  }
  return raw as ManualJournalEntryType
}

export function parseLegalEntityCode(value: unknown): DocumentEntityCode {
  const raw = String(value ?? "").trim().toUpperCase()
  if (!LEGAL_ENTITY_CODES.includes(raw as DocumentEntityCode)) {
    throw new Error("Invalid legalEntityCode")
  }
  return raw as DocumentEntityCode
}

export function parseEntryDate(value: unknown): Date {
  const raw = String(value ?? "").trim()
  if (!raw) throw new Error("entryDate is required")
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) throw new Error("Invalid entryDate")
  return date
}
