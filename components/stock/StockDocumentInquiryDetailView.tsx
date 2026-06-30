"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { FinanceAdminPageShell } from "@/components/finance/FinanceAdminPageShell"
import { StockDocumentInquiryPrintSheet } from "@/components/stock/StockDocumentInquiryPrintSheet"
import { StockDocumentPrintActions } from "@/components/stock/StockDocumentPrintActions"
import { formatAmount, formatDateTime } from "@/lib/finance-ui/format"
import {
  buildStockDocumentJournalInquiryPath,
  buildStockDocumentVoucherInquiryPath,
} from "@/lib/stock/inquiry/stock-document-inquiry-links"
import { formatStockDocumentInquiryHeader } from "@/lib/stock/inquiry/stock-document-phase-labels"
import { stockPhaseCodeToDocumentKind } from "@/lib/document-archive/stock-archive-kind"
import {
  buildStockDocumentInquiryReturnPath,
  fetchStockDocumentInquiryDetail,
  type StockDocumentInquiryDetail,
} from "@/lib/stock-ui/stock-document-inquiry"
import { useStockDocumentInquiryAutoprint } from "@/lib/stock-ui/use-stock-document-inquiry-autoprint"
import { formatDocStatusLabel } from "@/lib/stock-ui/format"
import {
  financeMemo,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  financeThRight,
  financeTotalLabel,
  financeTotalRow,
  financeTotalValue,
} from "@/lib/finance-ui/finance-visual-classes"
import {
  themeEmptyState,
  themeInlineError,
  themeLinkMuted,
  themeMeta,
  themeTextSecondary,
} from "@/lib/theme/theme-classes"

type StockDocumentInquiryDetailViewProps = {
  documentId: string
  returnTo?: string | null
}

function AuditTimestamp({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <p className={themeMeta}>
      <span className={themeTextSecondary}>{label}: </span>
      {value ? formatDateTime(value) : "—"}
    </p>
  )
}

export function StockDocumentInquiryDetailView({
  documentId,
  returnTo,
}: StockDocumentInquiryDetailViewProps) {
  const [detail, setDetail] = useState<StockDocumentInquiryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const listReturnPath = useMemo(
    () => returnTo?.trim() || buildStockDocumentInquiryReturnPath({}),
    [returnTo]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    void fetchStockDocumentInquiryDetail(documentId)
      .then((result) => {
        if (!cancelled) setDetail(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDetail(null)
          setError(err instanceof Error ? err.message : "Failed to load document")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [documentId])

  useStockDocumentInquiryAutoprint(Boolean(detail))

  const header = detail ? formatStockDocumentInquiryHeader(detail) : ""

  return (
    <FinanceAdminPageShell
      backHref={listReturnPath}
      backLabel="← Stock Document Inquiry"
      heading={
        <h1
          className="text-lg font-semibold tracking-tight"
          data-testid="stock-document-inquiry-detail-heading"
        >
          {loading ? "Loading…" : header || "Stock Document Inquiry"}
        </h1>
      }
      intro="Read-only stock document audit view — line detail, posting status, and finance linkage. No edit, post, or repair actions."
    >
      {loading ? <p className={themeEmptyState}>Loading…</p> : null}
      {error ? <p className={themeInlineError}>{error}</p> : null}

      {!loading && !error && detail ? (
        <div className="space-y-4" data-testid="stock-document-inquiry-detail">
          <StockDocumentPrintActions
            archiveVault={
              detail.posted
                ? {
                    documentKind: stockPhaseCodeToDocumentKind(detail.phaseCode),
                    documentId: detail.id,
                    documentNo: detail.documentNo,
                    legalEntityCode: detail.legalEntityCode,
                    branchId: detail.branchId,
                    workflowStatus: detail.status,
                    initialPdfAvailable: detail.pdfAvailable,
                  }
                : null
            }
          />
          <div className={financeTableScroll}>
            <table className={financeTable} data-testid="stock-document-inquiry-lines">
              <thead>
                <tr>
                  <th className={financeTh}>Product Code</th>
                  <th className={financeTh}>Description</th>
                  <th className={financeThRight}>Qty</th>
                  <th className={financeThRight}>Unit Cost</th>
                  <th className={financeThRight}>Amount</th>
                  <th className={financeTh}>Note</th>
                </tr>
              </thead>
              <tbody>
                {detail.lines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`py-4 text-center ${themeEmptyState}`}>
                      No lines on this document.
                    </td>
                  </tr>
                ) : (
                  detail.lines.map((line) => (
                    <tr key={line.id} data-testid={`stock-document-inquiry-line-${line.id}`}>
                      <td className="font-mono text-xs">{line.productCode}</td>
                      <td>{line.description}</td>
                      <td className={financeNumber}>{line.qty}</td>
                      <td className={financeNumber}>
                        {line.unitCost != null ? formatAmount(line.unitCost) : "—"}
                      </td>
                      <td className={financeNumber}>
                        {line.amount != null ? formatAmount(line.amount) : "—"}
                      </td>
                      <td className={financeMemo}>{line.note ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {detail.lines.length > 0 ? (
                <tfoot>
                  <tr className={financeTotalRow}>
                    <td colSpan={2} className={financeTotalLabel}>
                      Total
                    </td>
                    <td className={financeNumber}>{detail.totalQty}</td>
                    <td className={financeNumber}>—</td>
                    <td className={financeTotalValue}>
                      {detail.totalAmount != null
                        ? formatAmount(detail.totalAmount)
                        : "—"}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>

          <div
            className="space-y-1 border-t border-border pt-3"
            data-testid="stock-document-inquiry-status"
          >
            <p className={themeMeta}>
              <span className={themeTextSecondary}>Status: </span>
              {formatDocStatusLabel(detail.status)}
              {detail.posted ? " (Posted)" : ""}
            </p>
            <AuditTimestamp label="Created" value={detail.createdAt} />
            <AuditTimestamp label="Submitted" value={detail.submittedAt} />
            <AuditTimestamp label="Confirmed" value={detail.confirmedAt} />
            <AuditTimestamp label="Posted" value={detail.postedAt} />

            <div className="flex flex-wrap gap-3 pt-2">
              {detail.stockMovementPath ? (
                <Link
                  href={detail.stockMovementPath}
                  className={themeLinkMuted}
                  data-testid="stock-document-inquiry-operational-link"
                >
                  Operational document
                </Link>
              ) : null}
              {detail.voucherId ? (
                <Link
                  href={buildStockDocumentVoucherInquiryPath(
                    detail.voucherId,
                    listReturnPath
                  )}
                  className={themeLinkMuted}
                  data-testid="stock-document-inquiry-voucher-link"
                >
                  Finance voucher
                </Link>
              ) : null}
              {detail.journalEntryId ? (
                <Link
                  href={buildStockDocumentJournalInquiryPath(
                    detail.journalEntryId,
                    listReturnPath
                  )}
                  className={themeLinkMuted}
                  data-testid="stock-document-inquiry-journal-link"
                >
                  Journal entry
                </Link>
              ) : null}
              {detail.printPath ? (
                <Link
                  href={detail.printPath}
                  className={themeLinkMuted}
                  data-testid="stock-document-inquiry-print-link"
                >
                  Print
                </Link>
              ) : null}
            </div>
          </div>
          <StockDocumentInquiryPrintSheet detail={detail} />
        </div>
      ) : null}
    </FinanceAdminPageShell>
  )
}
