import type {
  ReconciliationIssueJournalRef,
  ReconciliationIssueRow,
  ReconciliationIssueVoucherRef,
} from "./types"
import { formatFinanceRefType } from "./traceability"

export function buildVoucherDetailPath(voucherId: string): string {
  return `/finance/vouchers/${encodeURIComponent(voucherId)}`
}

export function buildSnapshotDetailPath(snapshotId: string): string {
  return `/finance/reconciliation/snapshots/${encodeURIComponent(snapshotId)}`
}

export function formatOperationalSourceLabel(
  row: Pick<ReconciliationIssueRow, "sourceType" | "documentRef">
): string {
  return row.sourceType === "SALE"
    ? `POS sale · ${row.documentRef}`
    : `Stock document · ${row.documentRef}`
}

export function formatOperationalSourceKind(
  sourceType: ReconciliationIssueRow["sourceType"]
): string {
  return sourceType === "SALE" ? "POS sale" : "Stock document"
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
