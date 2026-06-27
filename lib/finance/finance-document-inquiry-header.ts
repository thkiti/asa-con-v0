import type { PrismaClient } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import type { FinanceDocumentHeaderContext } from "@/lib/finance-ui/finance-document-display"
import type { ManualJournalEntryTypeCode } from "@/lib/finance-ui/manual-journal-entry-display"
import { FINANCE_REF_TYPES } from "./posting-types"

const FINANCE_REF_TYPE_TO_ENTRY_TYPE: Partial<
  Record<string, ManualJournalEntryTypeCode>
> = {
  [FINANCE_REF_TYPES.MANUAL_JOURNAL]: "MANUAL",
  [FINANCE_REF_TYPES.MANUAL_JOURNAL_REVERSAL]: "MANUAL",
  [FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL]: "OPENING_BALANCE",
  [FINANCE_REF_TYPES.ADJUSTMENT_JOURNAL]: "ADJUSTMENT",
  [FINANCE_REF_TYPES.RECLASS_JOURNAL]: "RECLASS",
  [FINANCE_REF_TYPES.ACCRUAL_JOURNAL]: "ACCRUAL",
  [FINANCE_REF_TYPES.AUDITOR_ADJUSTMENT_JOURNAL]: "AUDITOR_ADJUSTMENT",
}

export type FinanceDocumentInquiryLink = {
  legalEntityCode: string
  refType: string
  refId: string
  refNo: string | null
  entryDate: string
  description: string | null
  postedAt: string
}

export function financeRefTypeMapsToOperationalDocument(refType: string): boolean {
  return refType in FINANCE_REF_TYPE_TO_ENTRY_TYPE
}

type FinanceDocumentInquiryPrisma = {
  manualJournalEntry?: Pick<
    PrismaClient["manualJournalEntry"],
    "findFirst"
  >
}

/** Resolve canonical document header for finance inquiry screens (read-only). */
export async function resolveFinanceDocumentHeaderContext(
  prisma: FinanceDocumentInquiryPrisma,
  link: FinanceDocumentInquiryLink
): Promise<FinanceDocumentHeaderContext | null> {
  const mappedEntryType = FINANCE_REF_TYPE_TO_ENTRY_TYPE[link.refType]
  if (!mappedEntryType) return null

  const manualEntry = prisma.manualJournalEntry
    ? await prisma.manualJournalEntry.findFirst({
        where: {
          id: link.refId,
          legalEntityCode: link.legalEntityCode as DocumentEntityCode,
        },
        select: {
          entryNo: true,
          entryType: true,
          entryDate: true,
          legalEntityCode: true,
          description: true,
          status: true,
          createdAt: true,
          submittedAt: true,
          confirmedAt: true,
          postedAt: true,
          cancelledAt: true,
        },
      })
    : null

  if (manualEntry) {
    return {
      legalEntityCode: manualEntry.legalEntityCode,
      entryType: manualEntry.entryType,
      documentNo: manualEntry.entryNo,
      entryDate: manualEntry.entryDate.toISOString(),
      status: manualEntry.status,
      description: manualEntry.description ?? "",
      createdAt: manualEntry.createdAt.toISOString(),
      submittedAt: manualEntry.submittedAt?.toISOString() ?? null,
      confirmedAt: manualEntry.confirmedAt?.toISOString() ?? null,
      postedAt: manualEntry.postedAt?.toISOString() ?? null,
      cancelledAt: manualEntry.cancelledAt?.toISOString() ?? null,
    }
  }

  const documentNo = link.refNo?.trim()
  if (!documentNo) return null

  return {
    legalEntityCode: link.legalEntityCode,
    entryType: mappedEntryType,
    documentNo,
    entryDate: link.entryDate,
    status: "POSTED",
    description: link.description ?? "",
    createdAt: link.postedAt,
    postedAt: link.postedAt,
  }
}
