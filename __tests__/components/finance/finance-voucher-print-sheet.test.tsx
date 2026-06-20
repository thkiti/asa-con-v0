import { renderToStaticMarkup } from "react-dom/server"
import { FinanceVoucherPrintSheet } from "@/components/finance/FinanceVoucherPrintSheet"
import type { FinanceVoucherPrintModel } from "@/lib/finance-ui/finance-voucher-print"

const model: FinanceVoucherPrintModel = {
  documentTypeCode: "MAJ",
  documentTypeTitle: "MANUAL JOURNAL VOUCHER",
  documentNo: "MAJ-260001",
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
    expect(html).toContain('data-testid="finance-document-header"')
    expect(html).toContain("Document Type")
    expect(html).toContain("MAJ")
    expect(html).toContain("Account Code")
    expect(html).toContain("Total Debit")
    expect(html).toContain("Prepared By")
    expect(html).toContain("Evidence Ref.")
    expect(html).toContain("Reprint from saved document data")
  })
})
