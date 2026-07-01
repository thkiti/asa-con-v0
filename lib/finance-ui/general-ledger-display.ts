import {
  appendFinanceReturnTo,
  buildFinanceJournalInquiryPath,
  buildFinanceVoucherDetailPath,
  buildOperationalParentDocumentPath,
} from "@/lib/finance-ui/finance-navigation"
import type { GeneralLedgerTransaction } from "@/lib/finance-ui/types"

export type GeneralLedgerRefFields = Pick<
  GeneralLedgerTransaction,
  | "journalEntryId"
  | "entryNo"
  | "sourceRef"
  | "sourceRefType"
  | "sourceRefId"
  | "voucherId"
>

/** Prefer business source document number; fall back to voucher number. */
export function formatGeneralLedgerRefDisplay(
  tx: Pick<GeneralLedgerTransaction, "sourceRef" | "entryNo">
): string {
  const sourceRef = tx.sourceRef?.trim()
  if (sourceRef) return sourceRef
  const entryNo = tx.entryNo?.trim()
  return entryNo || "—"
}

export function buildGeneralLedgerRefPath(
  tx: GeneralLedgerRefFields,
  returnTo?: string | null
): string {
  const refType = tx.sourceRefType?.trim()
  const refId = tx.sourceRefId?.trim()
  if (refType && refId) {
    const parentPath = buildOperationalParentDocumentPath(refType, refId)
    if (parentPath) {
      return appendFinanceReturnTo(parentPath, returnTo)
    }
  }

  const voucherId = tx.voucherId?.trim()
  if (voucherId) {
    return buildFinanceVoucherDetailPath(voucherId, returnTo)
  }

  return buildFinanceJournalInquiryPath(tx.journalEntryId, returnTo)
}
