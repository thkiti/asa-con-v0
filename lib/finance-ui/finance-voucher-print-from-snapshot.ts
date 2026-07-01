import {
  formatFinanceDocumentDate,
  formatFinanceDocumentTypeTitle,
} from "@/lib/finance-ui/finance-document-display"
import {
  formatManualJournalEntryDocumentNo,
  type ManualJournalEntryTypeCode,
} from "@/lib/finance-ui/manual-journal-entry-display"
import { formatDateTime } from "@/lib/finance-ui/format"
import { formatEntityShort } from "@/lib/legal-entity/display"
import type { ManualJournalEntryPdfSnapshot } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-snapshot-types"
import type { FinanceVoucherPrintModel } from "@/lib/finance-ui/finance-voucher-print"

function documentTypeCodeFromEntryNo(
  entryNo: string,
  entryType: ManualJournalEntryTypeCode
): string {
  const prefix = entryNo.trim().split("-")[0]?.toUpperCase()
  if (prefix) return prefix
  if (entryType === "OPENING_BALANCE") return "OPB"
  if (entryType === "MANUAL") return "MJV"
  return entryType.slice(0, 3).toUpperCase()
}

/** Map frozen POST-time snapshot to the same print model as browser Print Out. */
export function buildFinanceVoucherPrintModelFromManualJournalEntryPdfSnapshot(
  snapshot: ManualJournalEntryPdfSnapshot,
  options?: { branchLabel?: string | null }
): FinanceVoucherPrintModel {
  const branchLabel = options?.branchLabel?.trim() || snapshot.branchId
  const entryType = snapshot.entryType as ManualJournalEntryTypeCode

  return {
    documentTypeCode: documentTypeCodeFromEntryNo(snapshot.entryNo, entryType),
    documentTypeTitle: formatFinanceDocumentTypeTitle(entryType),
    documentNo: formatManualJournalEntryDocumentNo(snapshot.entryNo, entryType),
    documentDate: formatFinanceDocumentDate(snapshot.entryDate),
    legalEntityLabel: formatEntityShort(snapshot.legalEntityCode),
    branchLabel,
    status: "POSTED",
    reference: snapshot.refNo?.trim() || null,
    description: snapshot.description?.trim() || null,
    remarks: null,
    lines: snapshot.lines.map((line) => ({
      lineNo: line.lineNo,
      accountCode: line.accountCode,
      accountName: line.accountName,
      lineDescription: line.memo,
      debit: line.debit,
      credit: line.credit,
    })),
    totalDebit: snapshot.totalDebit,
    totalCredit: snapshot.totalCredit,
    preparedBy: snapshot.createdByStaffId,
    checkedBy: snapshot.confirmedByStaffId,
    approvedBy: snapshot.submittedByStaffId,
    postedBy: snapshot.postedByStaffId,
    postedAt: snapshot.postedAt,
    postedAtDisplay: formatDateTime(snapshot.postedAt),
    evidenceRef: snapshot.refNo?.trim() || null,
    attachmentRef: null,
    accountingVoucherId: snapshot.postedVoucherId,
    createdAt: snapshot.createdAt,
    submittedAt: snapshot.submittedAt,
    confirmedAt: snapshot.confirmedAt,
  }
}
