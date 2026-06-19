import { buildFinanceVoucherDetailPath } from "./finance-navigation"
import type {
  ReconciliationIssueJournalRef,
  ReconciliationIssueRow,
  ReconciliationIssueVoucherRef,
} from "./types"
import { formatFinanceRefType } from "./traceability"

export function buildVoucherDetailPath(
  voucherId: string,
  returnTo?: string | null
): string {
  return buildFinanceVoucherDetailPath(voucherId, returnTo)
}

export function buildSnapshotDetailPath(snapshotId: string): string {
  return `/finance/reconciliation/snapshots/${encodeURIComponent(snapshotId)}`
}

export function formatOperationalSourceLabel(
  row: Pick<ReconciliationIssueRow, "sourceType" | "documentRef">
): string {
  if (row.sourceType === "SALE") {
    return `POS sale · ${row.documentRef}`
  }
  if (row.sourceType === "REFUND") {
    return `POS refund · ${row.documentRef}`
  }
  return `Stock document · ${row.documentRef}`
}

export function formatOperationalSourceKind(
  sourceType: ReconciliationIssueRow["sourceType"]
): string {
  if (sourceType === "SALE") return "POS sale"
  if (sourceType === "REFUND") return "POS refund"
  return "Stock document"
}

export function formatVoucherLinkLabel(
  voucher: Pick<ReconciliationIssueVoucherRef, "voucherNo" | "id">
): string {
  return voucher.voucherNo || voucher.id
}

export function formatJournalLinkLabel(
  journal: Pick<ReconciliationIssueJournalRef, "id">,
  voucherNo?: string
): string {
  return voucherNo ? `Journal · ${voucherNo}` : journal.id
}

export function formatVoucherRefSummary(
  voucher: Pick<ReconciliationIssueVoucherRef, "refType" | "refId">
): string {
  return `${formatFinanceRefType(voucher.refType)} · ${voucher.refId}`
}
