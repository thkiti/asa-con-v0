import { renderToStaticMarkup } from "react-dom/server"
import { FinanceVoucherPostedPrintView } from "@/components/finance/FinanceVoucherPostedPrintView"
import type { FinanceVoucherPrintModel } from "@/lib/finance-ui/finance-voucher-print"

jest.mock("@/lib/finance-ui/finance-voucher-local-font", () => ({
  financeVoucherLocalFont: {
    variable: "font-finance-voucher",
    className: "font-finance-voucher",
  },
}))

const model: FinanceVoucherPrintModel = {
  documentTypeCode: "MJV",
  documentTypeTitle: "MANUAL JOURNAL VOUCHER",
  documentNo: "MJV-260001",
  documentDate: "14/06/2026",
  legalEntityLabel: "AS",
  branchLabel: "HO999 • Head Office",
  status: "POSTED",
  reference: null,
  description: "Test entry",
  remarks: null,
  payeeName: null,
  payFromLabel: null,
  chequeNo: null,
  customerName: null,
  dueDate: null,
  receivedFromName: null,
  receiveToLabel: null,
  receiptNo: null,
  pettyCashAccountLabel: null,
  preparedByStaffId: "staff-1",
  approvedByStaffId: "staff-2",
  checkedByStaffId: "staff-3",
  preparedBy: "staff-1",
  checkedBy: "staff-3",
  approvedBy: "staff-2",
  postedBy: "staff-1",
  postedAt: "2026-06-14T15:00:00.000Z",
  postedAtDisplay: "14/06/2026",
  evidenceRef: null,
  attachmentRef: null,
  accountingVoucherId: "voucher-1",
  createdAt: "2026-06-14T11:00:00.000Z",
  submittedAt: "2026-06-14T13:00:00.000Z",
  confirmedAt: "2026-06-14T14:00:00.000Z",
  lines: [
    {
      lineNo: 1,
      accountCode: "1100",
      accountName: "Cash",
      debit: "100.00",
      credit: "0.00",
      memo: "Line memo",
    },
  ],
  totalDebit: "100.00",
  totalCredit: "100.00",
}

describe("FinanceVoucherPostedPrintView screen layout", () => {
  it("uses embedded full-width root inside FinanceDocumentContainer pages", () => {
    const html = renderToStaticMarkup(
      <FinanceVoucherPostedPrintView
        model={model}
        entryType="MANUAL"
        legalEntityCode="AS"
        entryDate="2026-06-14"
        description="Test entry"
        listHref="/finance/manual-journal-entries"
        listBackLabel="Journal entries"
        embeddedInDocumentContainer
        compactScreenHeader
        showListBackLink={false}
      />
    )

    expect(html).toContain("finance-voucher-print-root--embedded")
    expect(html).toContain("w-full max-w-full")
    expect(html).not.toContain("finance-document-container")
    expect(html).not.toContain("max-w-3xl")
    expect(html).not.toContain("max-w-4xl")
  })

  it("hides print actions when showPrintActions is false", () => {
    const html = renderToStaticMarkup(
      <FinanceVoucherPostedPrintView
        model={model}
        entryType="MANUAL"
        legalEntityCode="AS"
        entryDate="2026-06-14"
        description="Test entry"
        listHref="/finance/manual-journal-entries"
        listBackLabel="Journal entries"
        embeddedInDocumentContainer
        showPrintActions={false}
        compactArchiveActions
        archive={{
          entryId: "entry-1",
          entryNo: "MJV-260001",
          pdfSnapshotReady: true,
        }}
        postedJournalHref="/finance/journal-entries/journal-1"
      />
    )

    expect(html).not.toContain('data-testid="action-print-out"')
    expect(html).not.toContain('data-testid="action-save-pdf"')
    expect(html).not.toContain('data-testid="action-download-pdf"')
    expect(html).not.toContain('data-testid="finance-legacy-pdf-snapshot"')
    expect(html).toContain('data-testid="action-view-pdf"')
    expect(html).toContain('data-testid="posted-journal-link"')
    expect(html).toContain('data-testid="posted-document-actions"')
    expect(html).toContain('data-testid="posted-document-sticky-bar"')
    expect(html).toContain('data-testid="posted-document-sticky-identity"')
    expect(html).toContain("finance-posted-document-sticky-bar")
    expect(html).toContain("ASAS • MJV-260001 • POSTED")
    expect(html).toContain('data-testid="finance-voucher-lines-table-header"')
  })

  it("uses vault compact archive actions when archive vault PDF is available", () => {
    const html = renderToStaticMarkup(
      <FinanceVoucherPostedPrintView
        model={model}
        entryType="MANUAL"
        legalEntityCode="AS"
        entryDate="2026-06-14"
        description="Test entry"
        listHref="/finance/payment-vouchers"
        listBackLabel="Payment vouchers"
        embeddedInDocumentContainer
        compactScreenHeader
        showListBackLink={false}
        showPrintActions={false}
        compactArchiveActions
        archiveVault={{
          documentKind: "PAV",
          documentId: "pav-1",
          documentNo: "PAV-260001",
          legalEntityCode: "AS",
          workflowStatus: "POSTED",
          initialPdfAvailable: true,
        }}
        postedJournalHref="/finance/journal-entries/journal-1"
      />
    )

    expect(html).toContain('data-testid="action-view-pdf"')
    expect(html).toContain('data-testid="posted-journal-link"')
    expect(html).not.toContain('data-testid="action-print-out"')
    expect(html).not.toContain('data-testid="action-upload-pdf"')
    expect(html).not.toContain('data-testid="action-download-pdf"')
    expect(html).not.toContain('data-testid="document-archive-missing-panel"')
  })

  it("shows vault missing panel when archive vault PDF is unavailable", () => {
    const html = renderToStaticMarkup(
      <FinanceVoucherPostedPrintView
        model={model}
        entryType="MANUAL"
        legalEntityCode="AS"
        entryDate="2026-06-14"
        description="Test entry"
        listHref="/finance/payment-vouchers"
        listBackLabel="Payment vouchers"
        embeddedInDocumentContainer
        compactArchiveActions
        archiveVault={{
          documentKind: "PAV",
          documentId: "pav-1",
          documentNo: "PAV-260001",
          legalEntityCode: "AS",
          workflowStatus: "POSTED",
          initialPdfAvailable: false,
        }}
      />
    )

    expect(html).toContain('data-testid="document-archive-missing-panel"')
    expect(html).not.toContain('data-testid="action-view-pdf"')
    expect(html).not.toContain('data-testid="action-print-out"')
  })

  it("keeps standalone pages on FinanceDocumentContainer width", () => {
    const html = renderToStaticMarkup(
      <FinanceVoucherPostedPrintView
        model={model}
        entryType="MANUAL"
        legalEntityCode="AS"
        entryDate="2026-06-14"
        description="Test entry"
        listHref="/finance/payment-vouchers"
        listBackLabel="Payment vouchers"
      />
    )

    expect(html).toContain("finance-document-container")
    expect(html).not.toContain("finance-voucher-print-root--embedded")
  })
})
