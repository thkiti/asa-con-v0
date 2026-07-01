import { renderToStaticMarkup } from "react-dom/server"
import { FinanceVoucherPrintSheet } from "@/components/finance/FinanceVoucherPrintSheet"
import { ACCOUNT_DISPLAY_BULLET, ACCOUNT_DISPLAY_SEPARATOR } from "@/lib/finance-ui/format-account"
import type { FinanceVoucherPrintModel } from "@/lib/finance-ui/finance-voucher-print"

const model: FinanceVoucherPrintModel = {
  documentTypeCode: "MJV",
  documentTypeTitle: "MANUAL JOURNAL VOUCHER",
  documentNo: "MJV-260001",
  documentDate: "14.06.2026",
  legalEntityLabel: "ASAS",
  branchLabel: "HO999 — Head Office",
  status: "POSTED",
  reference: "REF-1",
  description: "Test voucher",
  remarks: null,
  lines: [
    {
      lineNo: 1,
      accountCode: "1100",
      accountName: "Cash",
      lineDescription: "Memo",
      debit: "50.00",
      credit: "0.00",
    },
  ],
  totalDebit: "50.00",
  totalCredit: "50.00",
  preparedBy: "staff-1",
  checkedBy: "staff-2",
  approvedBy: "staff-3",
  postedBy: "staff-4",
  postedAt: "2026-06-14T15:00:00.000Z",
  postedAtDisplay: "14.06.2026 15:00",
  evidenceRef: "REF-1",
  attachmentRef: null,
  accountingVoucherId: "voucher-uuid",
  createdAt: "2026-06-14T11:00:00.000Z",
  submittedAt: null,
  confirmedAt: null,
}

describe("FinanceVoucherPrintSheet", () => {
  it("renders standard MJV voucher sections from print model", () => {
    const html = renderToStaticMarkup(
      <FinanceVoucherPrintSheet
        model={model}
        entryType="MANUAL"
        legalEntityCode="AS"
        entryDate="2026-06-14"
        description="Test voucher"
      />
    )

    expect(html).toContain('data-testid="finance-voucher-print-sheet"')
    expect(html).toContain('data-finance-print-font="THSarabunNew"')
    expect(html).toContain("finance-voucher-print-font")
    expect(html).toContain('data-testid="finance-document-header"')
    expect(html).toContain("Document Type")
    expect(html).toContain("MJV")
    expect(html).toContain(">Account<")
    expect(html).not.toContain("Account Code")
    expect(html).not.toContain("Account Name")
    expect(html).not.toContain("Being / Description")
    expect(html).not.toContain('data-testid="finance-voucher-reference"')
    expect(html).toContain("Line Description")
    expect(html).not.toContain("finance-voucher-print-paginated")
    expect(html).not.toContain("finance-print-page-identity")
    expect(html).not.toContain("Page 1 of")
    expect(html).toContain("END OF VOUCHER")
    expect(html).toContain('data-testid="finance-voucher-end-marker"')
    expect(html).not.toContain("Document No. MJV-260001")
    const accountIdx = html.indexOf(">Account<")
    const debitIdx = html.indexOf(">Debit<")
    const creditIdx = html.indexOf(">Credit<")
    const lineDescIdx = html.indexOf(">Line Description<")
    expect(accountIdx).toBeGreaterThan(-1)
    expect(accountIdx).toBeLessThan(debitIdx)
    expect(debitIdx).toBeLessThan(creditIdx)
    expect(creditIdx).toBeLessThan(lineDescIdx)
    expect(html).toContain("Total Debit")
    expect(html).toContain('data-testid="finance-voucher-closing-blocks"')
    expect(html).toContain('data-testid="finance-voucher-control"')
    expect(html).toContain("finance-voucher-signature-block")
    expect(html).toContain("finance-voucher-evidence-block")
    expect(html).toContain("Prepared By")
    expect(html).toContain("Evidence Ref.")
    expect(html).toContain("Reprint from saved document data")
    expect(html).not.toContain("finance-voucher-print-screen-sheet")
  })

  it("omits the large reference block for OPB-like vouchers with header description only", () => {
    const opbModel: FinanceVoucherPrintModel = {
      ...model,
      documentTypeCode: "OPB",
      documentNo: "OPB-260001",
      reference: null,
      description: "OPENING BALANCE 2026",
      remarks: null,
    }

    const html = renderToStaticMarkup(
      <FinanceVoucherPrintSheet
        model={opbModel}
        entryType="OPENING_BALANCE"
        legalEntityCode="AS"
        entryDate="2026-06-14"
        description="OPENING BALANCE 2026"
      />
    )

    expect(html).not.toContain('data-testid="finance-voucher-reference"')
    expect(html).not.toContain('data-testid="finance-voucher-compact-context"')
    expect(html).toContain("Description:</span> OPENING BALANCE 2026")
    expect(html).not.toContain("Reference:")
  })

  it("shows a compact reference line only when reference is present", () => {
    const html = renderToStaticMarkup(
      <FinanceVoucherPrintSheet
        model={{ ...model, reference: "INV-100", description: "Test voucher" }}
        entryType="MANUAL"
        legalEntityCode="AS"
        entryDate="2026-06-14"
        description="Test voucher"
      />
    )

    expect(html).toContain('data-testid="finance-voucher-compact-context"')
    expect(html).toContain("Reference:</span> INV-100")
    expect(html).not.toContain("Being / Description")
  })

  it("renders account as code • name in a single Account column", () => {
    const html = renderToStaticMarkup(
      <FinanceVoucherPrintSheet
        model={model}
        entryType="MANUAL"
        legalEntityCode="AS"
        entryDate="2026-06-14"
        description="Test voucher"
      />
    )

    expect(html).toContain('data-testid="finance-voucher-line-account-1"')
    expect(html).toContain('class="finance-account-code finance-account-code-part"')
    expect(html).toContain('class="finance-account-name finance-account-name-part"')
    expect(html).toContain(ACCOUNT_DISPLAY_BULLET)
    expect(html).toContain("1100")
    expect(html).toContain("Cash")
  })
})
