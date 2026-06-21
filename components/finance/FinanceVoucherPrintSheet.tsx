import { FinanceDocumentCanonicalHeader } from "@/components/finance/FinanceDocumentCanonicalHeader"
import { FinanceVoucherPrintLinesTable } from "@/components/finance/FinanceVoucherPrintLinesTable"
import {
  formatFinanceDocumentDate,
} from "@/lib/finance-ui/finance-document-display"
import type { FinanceVoucherPrintModel } from "@/lib/finance-ui/finance-voucher-print"
import { buildFinanceVoucherPrintCompactContextLines } from "@/lib/finance-ui/finance-voucher-print-compact-context"
import { FINANCE_VOUCHER_PRINT_FONT_DATA_ATTR } from "@/lib/finance-ui/finance-voucher-print-font"

type FinanceVoucherPrintSheetProps = {
  model: FinanceVoucherPrintModel
  /** Entry type for canonical header row 1 (e.g. MANUAL, OPENING_BALANCE). */
  entryType: string
  legalEntityCode: string
  entryDate: string
  description: string
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="finance-voucher-meta-label">{label}</dt>
      <dd className="finance-voucher-meta-value">{value}</dd>
    </div>
  )
}

function SignatureField({
  label,
  staffId,
}: {
  label: string
  staffId: string | null
}) {
  return (
    <div className="finance-voucher-signature-field print-break-inside-avoid">
      <p className="finance-voucher-signature-label">{label}</p>
      <div className="finance-voucher-signature-line" aria-hidden="true" />
      <p className="finance-voucher-signature-staff">{staffId?.trim() || "—"}</p>
    </div>
  )
}

/** Shared A4 finance voucher layout — same DOM for screen and browser print. */
export function FinanceVoucherPrintSheet({
  model,
  entryType,
  legalEntityCode,
  entryDate,
  description,
}: FinanceVoucherPrintSheetProps) {
  const printedAtDisplay = formatFinanceDocumentDate(new Date().toISOString())
  const compactContextLines = buildFinanceVoucherPrintCompactContextLines({
    headerDescription: description,
    reference: model.reference,
    description: model.description,
    remarks: model.remarks,
    payeeName: model.payeeName,
    payFromLabel: model.payFromLabel,
    chequeNo: model.chequeNo,
  })

  return (
    <article
      className="finance-voucher-print-sheet finance-voucher-print-font"
      data-testid="finance-voucher-print-sheet"
      data-finance-print-font={FINANCE_VOUCHER_PRINT_FONT_DATA_ATTR}
    >
      <header className="finance-voucher-print-header print-break-inside-avoid">
        <FinanceDocumentCanonicalHeader
          legalEntityCode={legalEntityCode}
          entryType={entryType}
          documentNo={model.documentNo}
          entryDate={entryDate}
          status={model.status}
          description={description}
          createdAt={model.createdAt}
          submittedAt={model.submittedAt}
          confirmedAt={model.confirmedAt}
          postedAt={model.postedAt}
        />

        <dl className="finance-voucher-meta-grid" data-testid="finance-voucher-meta-grid">
          <MetaField label="Document Type" value={model.documentTypeCode} />
          <MetaField label="Document No." value={model.documentNo} />
          <MetaField label="Document Date" value={model.documentDate} />
          <MetaField label="Legal Entity" value={model.legalEntityLabel} />
          <MetaField label="Branch" value={model.branchLabel} />
          <MetaField label="Status" value={model.status} />
        </dl>
      </header>

      {compactContextLines.length > 0 ? (
        <div
          className="finance-voucher-print-compact-context"
          data-testid="finance-voucher-compact-context"
        >
          {compactContextLines.map((line) => (
            <p key={line.label} className="finance-voucher-print-compact-line">
              <span className="finance-voucher-print-compact-label">{line.label}:</span>{" "}
              {line.value}
            </p>
          ))}
        </div>
      ) : null}

      <section className="finance-voucher-lines" data-testid="finance-voucher-lines">
        <FinanceVoucherPrintLinesTable
          lines={model.lines}
          totalDebit={model.totalDebit}
          totalCredit={model.totalCredit}
        />
      </section>

      <div
        className="finance-voucher-closing-blocks"
        data-testid="finance-voucher-closing-blocks"
      >
        <section
          className="finance-voucher-control finance-voucher-signature-block print-break-inside-avoid"
          data-testid="finance-voucher-control"
        >
          <h3 className="finance-voucher-section-title">Control</h3>
          <div className="finance-voucher-signature-grid">
            <SignatureField label="Prepared By" staffId={model.preparedBy} />
            <SignatureField label="Checked By" staffId={model.checkedBy} />
            <SignatureField label="Approved By" staffId={model.approvedBy} />
          </div>
          <dl className="finance-voucher-posted-meta">
            <div>
              <dt>Posted By</dt>
              <dd>{model.postedBy?.trim() || "—"}</dd>
            </div>
            <div>
              <dt>Posted At</dt>
              <dd>{model.postedAtDisplay ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section
          className="finance-voucher-evidence finance-voucher-evidence-block print-break-inside-avoid"
          data-testid="finance-voucher-evidence"
        >
          <h3 className="finance-voucher-section-title">Evidence / Reference</h3>
          <dl className="finance-voucher-evidence-grid">
            <div>
              <dt>Evidence Ref.</dt>
              <dd>{model.evidenceRef ?? "—"}</dd>
            </div>
            <div>
              <dt>Attachment Ref.</dt>
              <dd>{model.attachmentRef ?? "—"}</dd>
            </div>
            {model.accountingVoucherId ? (
              <div>
                <dt>Accounting Voucher</dt>
                <dd className="finance-voucher-technical-id">{model.accountingVoucherId}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <footer className="finance-voucher-print-footer no-print">
          <p>
            Printed {printedAtDisplay} • Reprint from saved document data
          </p>
        </footer>

        <footer
          className="finance-voucher-print-document-footer"
          data-testid="finance-voucher-end-marker"
        >
          <p>END OF VOUCHER</p>
        </footer>
      </div>
    </article>
  )
}
