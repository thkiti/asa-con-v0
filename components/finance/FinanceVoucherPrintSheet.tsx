import { FinanceDocumentCanonicalHeader } from "@/components/finance/FinanceDocumentCanonicalHeader"
import { formatAmount } from "@/lib/finance-ui/format"
import {
  formatFinanceDocumentDate,
} from "@/lib/finance-ui/finance-document-display"
import type { FinanceVoucherPrintModel } from "@/lib/finance-ui/finance-voucher-print"
import {
  financeAccount,
  financeMemo,
  financeNumber,
  financeTable,
  financeTh,
  financeThRight,
  financeTotalLabel,
  financeTotalRow,
  financeTotalRowStrong,
  financeTotalValue,
} from "@/lib/finance-ui/finance-visual-classes"

type FinanceVoucherPrintSheetProps = {
  model: FinanceVoucherPrintModel
  /** Entry type for canonical header row 1 (e.g. MANUAL, OPENING_BALANCE). */
  entryType: string
  legalEntityCode: string
  entryDate: string
  description: string
}

function formatSideAmount(value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) return "—"
  return formatAmount(value)
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

/** Shared A4 finance voucher print layout — foundation for MJV / PAY / REV / Petty Cash. */
export function FinanceVoucherPrintSheet({
  model,
  entryType,
  legalEntityCode,
  entryDate,
  description,
}: FinanceVoucherPrintSheetProps) {
  return (
    <article className="finance-voucher-print-sheet" data-testid="finance-voucher-print-sheet">
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

      <section
        className="finance-voucher-reference print-break-inside-avoid"
        data-testid="finance-voucher-reference"
      >
        <dl className="finance-voucher-reference-grid">
          <div>
            <dt>Reference</dt>
            <dd>{model.reference ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt>Being / Description</dt>
            <dd>{model.description ?? "—"}</dd>
          </div>
          {model.remarks ? (
            <div className="sm:col-span-3">
              <dt>Remarks</dt>
              <dd>{model.remarks}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="finance-voucher-lines" data-testid="finance-voucher-lines">
        <table className={`${financeTable} finance-voucher-lines-table`}>
          <thead>
            <tr>
              <th className={financeTh}>Account Code</th>
              <th className={financeTh}>Account Name</th>
              <th className={financeTh}>Line Description</th>
              <th className={financeThRight}>Debit</th>
              <th className={financeThRight}>Credit</th>
            </tr>
          </thead>
          <tbody>
            {model.lines.map((line) => (
              <tr key={line.lineNo}>
                <td className="finance-voucher-account-code">{line.accountCode}</td>
                <td className={financeAccount}>{line.accountName}</td>
                <td className={financeMemo}>{line.lineDescription?.trim() || "—"}</td>
                <td className={financeNumber}>{formatSideAmount(line.debit)}</td>
                <td className={financeNumber}>{formatSideAmount(line.credit)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={financeTotalRow}>
              <td className={financeTotalLabel} colSpan={3}>
                Total Debit
              </td>
              <td className={financeTotalValue} data-testid="finance-voucher-total-debit">
                {formatAmount(model.totalDebit)}
              </td>
              <td />
            </tr>
            <tr className={financeTotalRowStrong}>
              <td className={financeTotalLabel} colSpan={3}>
                Total Credit
              </td>
              <td />
              <td className={financeTotalValue} data-testid="finance-voucher-total-credit">
                {formatAmount(model.totalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section
        className="finance-voucher-control print-break-inside-avoid"
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
        className="finance-voucher-evidence print-break-inside-avoid"
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
              <dd className="font-mono text-xs">{model.accountingVoucherId}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <footer className="finance-voucher-print-footer print-break-inside-avoid">
        <p>
          Printed {formatFinanceDocumentDate(new Date().toISOString())} • Reprint from saved
          document data
        </p>
      </footer>
    </article>
  )
}
