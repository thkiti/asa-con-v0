import { renderToStaticMarkup } from "react-dom/server"
import FinanceVoucherInquiryPage from "@/app/(main)/finance/vouchers/page"
import { FinanceVoucherInquiryDetailView } from "@/components/finance/FinanceVoucherInquiryDetailView"
import { VoucherInquiryListPage, VoucherInquiryResultsTable } from "@/components/finance/VoucherInquiryListPage"
import { VoucherInquiryPdfIndicator } from "@/components/finance/VoucherInquiryPdfIndicator"
import { VOUCHER_INQUIRY_REF_TYPE_OPTIONS } from "@/lib/finance/inquiry/voucher-document-types"
import {
  financeFilterSelect,
  financePdfIndicatorExists,
  financePdfIndicatorMissing,
  voucherInquiryFilterControl,
  voucherInquiryFilterFramed,
  voucherInquiryFilterSelect,
} from "@/lib/finance-ui/finance-visual-classes"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

jest.mock("@/components/main/EntityContextPageHeading", () => ({
  EntityContextPageHeading: ({ title }: { title: string }) => (
    <h1 data-testid="entity-context-page-heading">{title}</h1>
  ),
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/finance/vouchers",
  useSearchParams: () =>
    new URLSearchParams(
      "legalEntityCode=AS&periodKey=2026-06&from=2026-06-01&to=2026-06-30&refType=MJV&postingState=all"
    ),
}))

jest.mock("@/lib/finance-ui/use-finance-legal-entity-scope", () => ({
  useFinanceLegalEntityScope: () => "AS",
}))

jest.mock("@/lib/finance-ui/voucher-inquiry", () => {
  const actual = jest.requireActual("@/lib/finance-ui/voucher-inquiry")
  return {
    ...actual,
    fetchFinanceDocuments: jest.fn(),
    fetchFinanceVouchers: jest.fn(),
  }
})

jest.mock("@/lib/finance-ui/fetchers", () => ({
  fetchVoucherById: jest.fn(),
}))

jest.mock("@/lib/finance-ui/pos-settlement-branches", () => ({
  fetchPosSettlementBranches: jest.fn().mockResolvedValue({
    items: [{ id: "branch-1", code: "SH001", name: "Shop 1" }],
  }),
  formatPosSettlementBranchLabel: (branch: { code: string; name: string }) =>
    `${branch.code} • ${branch.name}`,
}))

import { fetchFinanceDocuments } from "@/lib/finance-ui/voucher-inquiry"

const mockFetchFinanceDocuments = fetchFinanceDocuments as jest.Mock

const recListRow = {
  id: "voucher-rec-1",
  rowKind: "posted" as const,
  legalEntityCode: "AS",
  documentTypeCode: "REC",
  documentNo: "REC-SH001-202606-0001",
  voucherNo: "V-2026-06-00010",
  date: "2026-06-15T00:00:00.000Z",
  periodKey: "2026-06",
  branchId: "branch-1",
  branchCode: "SH001",
  branchName: "Shop 1",
  status: "POSTED",
  amount: "1500",
  journalEntryId: "journal-rec-1",
  operationalDocumentId: "sale-1",
  pdfAvailable: true,
  inquiryPath: "/shop/receipt/sale-1?branchId=branch-1",
  printPath: "/shop/receipt/sale-1?branchId=branch-1&autoprint=1",
}

const refListRow = {
  ...recListRow,
  id: "voucher-ref-1",
  documentTypeCode: "REF",
  documentNo: "REF-SH001-202606-0002",
  voucherNo: "V-2026-06-00011",
  journalEntryId: "journal-ref-1",
  operationalDocumentId: "refund-1",
  pdfAvailable: null,
  amount: "500",
  inquiryPath: "/shop/refund-receipt/refund-1?branchId=branch-1",
  printPath: "/shop/refund-receipt/refund-1?branchId=branch-1&autoprint=1",
}

const listRow = {
  id: "voucher-pickup-1",
  rowKind: "posted" as const,
  legalEntityCode: "AS",
  documentTypeCode: "COL",
  documentNo: "COL-260001",
  voucherNo: "V-2026-06-00001",
  date: "2026-06-14T00:00:00.000Z",
  periodKey: "2026-06",
  branchId: "branch-1",
  branchCode: "SH001",
  branchName: "Shop 1",
  status: "POSTED",
  amount: "5000",
  journalEntryId: "journal-pickup-1",
  operationalDocumentId: null,
  pdfAvailable: null,
  inquiryPath: "/finance/vouchers/voucher-pickup-1",
  printPath: null,
}

const unpostedMjvRow = {
  id: "mje-draft-1",
  rowKind: "unposted" as const,
  legalEntityCode: "AS",
  documentTypeCode: "MJV",
  documentNo: "MJV-260001",
  voucherNo: null,
  date: "2026-06-10T00:00:00.000Z",
  periodKey: null,
  branchId: "branch-1",
  branchCode: "SH001",
  branchName: "Shop 1",
  status: "DRAFT",
  amount: "1200",
  journalEntryId: null,
  operationalDocumentId: "mje-draft-1",
  pdfAvailable: false,
  inquiryPath: "/finance/manual-journal-entries/mje-draft-1",
  printPath: null,
}

const postedMjvWithPdfRow = {
  ...unpostedMjvRow,
  id: "mje-posted-1",
  rowKind: "posted" as const,
  voucherNo: "V-2026-06-00099",
  status: "POSTED",
  journalEntryId: "journal-mjv-1",
  pdfAvailable: true,
  operationalDocumentId: "mje-posted-1",
  inquiryPath: "/finance/manual-journal-entries/mje-posted-1",
  printPath: "/finance/manual-journal-entries/mje-posted-1/print",
}

const postedPavRow = {
  id: "voucher-pav-1",
  rowKind: "posted" as const,
  legalEntityCode: "AS",
  documentTypeCode: "PAV",
  documentNo: "PAV-260001",
  voucherNo: "V-2026-06-00020",
  date: "2026-06-16T00:00:00.000Z",
  periodKey: "2026-06",
  branchId: "branch-1",
  branchCode: "SH001",
  branchName: "Shop 1",
  status: "POSTED",
  amount: "1500",
  journalEntryId: "journal-pav-1",
  operationalDocumentId: "pav-1",
  pdfAvailable: null,
  inquiryPath: "/finance/payment-vouchers/pav-1",
  printPath: "/finance/payment-vouchers/pav-1?autoprint=1",
}

const postedRevRow = {
  ...postedPavRow,
  id: "voucher-rev-1",
  documentTypeCode: "REV",
  documentNo: "REV-260001",
  voucherNo: "V-2026-06-00021",
  journalEntryId: "journal-rev-1",
  operationalDocumentId: "rev-1",
  amount: "3000",
  inquiryPath: "/finance/revenue-vouchers/rev-1",
  printPath: "/finance/revenue-vouchers/rev-1?autoprint=1",
}

const postedPcvRow = {
  ...postedPavRow,
  id: "voucher-pcv-1",
  documentTypeCode: "PCV",
  documentNo: "PCV-260001",
  voucherNo: "V-2026-06-00022",
  journalEntryId: "journal-pcv-1",
  operationalDocumentId: "pcv-1",
  inquiryPath: "/finance/petty-cash-vouchers/pcv-1",
  printPath: "/finance/petty-cash-vouchers/pcv-1?autoprint=1",
}

const postedPavMissingPdfRow = {
  ...postedPavRow,
  pdfAvailable: false,
}

const postedPavWithPdfRow = {
  ...postedPavRow,
  pdfAvailable: true,
}

const collectorPickupVoucher = {
  id: "voucher-pickup-1",
  voucherNo: "V-2026-06-00001",
  legalEntityCode: "AS",
  periodKey: "2026-06",
  date: "2026-06-14T00:00:00.000Z",
  status: "POSTED",
  branchId: "branch-1",
  refType: FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP,
  refId: "collector-report-1",
  refNo: "COL-260001",
  description: "Collector pickup settlement",
  postedAt: "2026-06-14T15:00:00.000Z",
  documentHeader: null,
  lines: [],
  journal: {
    id: "journal-pickup-1",
    postedAt: "2026-06-14T15:00:00.000Z",
    lines: [
      {
        id: "jl-1",
        lineNo: 1,
        accountCode: "1031",
        accountName: "Cash in transit",
        debit: "5000",
        credit: "0",
        memo: null,
      },
      {
        id: "jl-2",
        lineNo: 2,
        accountCode: "1001",
        accountName: "Cash on hand",
        debit: "0",
        credit: "5000",
        memo: null,
      },
    ],
  },
}

const bankDepositVoucher = {
  ...collectorPickupVoucher,
  id: "voucher-deposit-1",
  voucherNo: "V-2026-06-00002",
  refType: FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT,
  refId: "deposit-1",
  refNo: "PAYIN-260001",
  journal: {
    id: "journal-deposit-1",
    postedAt: "2026-06-15T10:00:00.000Z",
    lines: [
      {
        id: "jl-3",
        lineNo: 1,
        accountCode: "1021",
        accountName: "Bank",
        debit: "5000",
        credit: "0",
        memo: null,
      },
      {
        id: "jl-4",
        lineNo: 2,
        accountCode: "1031",
        accountName: "Cash in transit",
        debit: "0",
        credit: "5000",
        memo: null,
      },
    ],
  },
}

describe("FinanceVoucherInquiryPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchFinanceDocuments.mockResolvedValue({ documents: [listRow], total: 1 })
  })

  it("renders simplified finance document inquiry filters", () => {
    const html = renderToStaticMarkup(<FinanceVoucherInquiryPage />)
    expect(html).toContain('data-testid="finance-admin-page"')
    expect(html).toContain("Finance Document Inquiry")
    expect(html).toContain('data-testid="voucher-inquiry-filters"')
    expect(html).toContain("voucher-inquiry-filter-bar")
    expect(html).toContain('data-testid="voucher-inquiry-filter-branch"')
    expect(html).toContain('data-testid="voucher-inquiry-filter-period-year"')
    expect(html).toContain('data-testid="voucher-inquiry-filter-period-month"')
    expect(html).toContain(">Year</span>")
    expect(html).toContain(">Month</span>")
    expect(html).toContain('data-testid="voucher-inquiry-more-filter"')
    expect(html).not.toContain('data-testid="voucher-inquiry-filter-from"')
    expect(html).not.toContain('data-testid="voucher-inquiry-more-filter-panel"')
    expect(html).toContain('data-active="true"')
    expect(html).toContain("voucher-inquiry-more-filter-button--active")
    expect(html).toContain('data-testid="voucher-inquiry-filter-document-type"')
    expect(html).toContain('data-testid="voucher-inquiry-filter-no"')
    expect(html).toContain('data-testid="voucher-inquiry-filter-status"')
    expect(html).toContain('data-testid="voucher-inquiry-filter-posting-state"')
    expect(html).toContain(financeFilterSelect)
    expect(html).toContain(voucherInquiryFilterControl)
    expect(html).toContain(voucherInquiryFilterFramed)
    expect(html).toContain(voucherInquiryFilterSelect)
    expect(html).toContain('data-testid="voucher-inquiry-search"')
    expect(html).toContain('data-testid="voucher-inquiry-clear"')
    expect(html).not.toContain('data-testid="voucher-inquiry-filter-document-no"')
    expect(html).not.toContain('data-testid="voucher-inquiry-filter-voucher-no"')
    expect(html).not.toContain('data-testid="voucher-inquiry-filter-amount-min"')
    expect(html).not.toContain('data-testid="voucher-inquiry-filter-pdf-state"')
    expect(html).toContain("Doc Type")
    expect(html).not.toContain("Document Type")
    expect(html).not.toContain("Archive PDF")
    expect(html).not.toContain("Amount min")
  })
})

describe("VoucherInquiryListPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchFinanceDocuments.mockResolvedValue({ documents: [listRow], total: 1 })
  })

  it("renders simplified audit table columns", () => {
    const html = renderToStaticMarkup(
      <VoucherInquiryResultsTable
        documents={[listRow]}
        total={1}
        listReturnPath="/finance/vouchers"
      />
    )
    expect(html).toContain('data-testid="voucher-inquiry-table"')
    expect(html).toContain("Doc No.")
    expect(html).toContain("Voucher No.")
    expect(html).toContain("Journal Entry")
    expect(html).toContain("COL-260001")
    expect(html).toContain("V-2026-06-00001")
    expect(html).toContain('data-testid="voucher-inquiry-journal-voucher-pickup-1"')
    expect(html).toContain('data-testid="voucher-inquiry-view-voucher-pickup-1"')
    expect(html).toContain("Inquiry")
    expect(html).toContain("14/06/2026")
    expect(html).toContain("voucher-inquiry-table")
    expect(html).not.toContain(">Entity<")
    expect(html).not.toContain(">Amount<")
    expect(html).not.toContain(">Branch<")
    expect(html).not.toContain(">Type<")
    expect(html).not.toContain("text-zinc-")
    expect(html).toContain("text-secondary")
  })

  it("renders PDF status dots with accessible labels", () => {
    const html = renderToStaticMarkup(
      <>
        <VoucherInquiryPdfIndicator row={postedMjvWithPdfRow} />
        <VoucherInquiryPdfIndicator row={unpostedMjvRow} />
        <VoucherInquiryPdfIndicator row={refListRow} />
      </>
    )
    expect(html).toContain(financePdfIndicatorExists)
    expect(html).toContain('aria-label="PDF exists"')
    expect(html).toContain("/api/finance/manual-journal-entries/mje-posted-1/pdf")
    expect(html).toContain(financePdfIndicatorMissing)
    expect(html).toContain('aria-label="PDF missing"')
    expect(html).not.toContain('aria-label="PDF not supported"')
    expect(html).not.toContain(">Yes<")
    expect(html).not.toContain(">Missing<")
  })

  it("shows missing PDF dot for unposted manual journal rows", () => {
    const html = renderToStaticMarkup(
      <VoucherInquiryResultsTable
        documents={[unpostedMjvRow]}
        total={1}
        listReturnPath="/finance/vouchers"
      />
    )
    expect(html).toContain('data-testid="voucher-inquiry-pdf-mje-draft-1"')
    expect(html).toContain(financePdfIndicatorMissing)
    expect(html).toContain('aria-label="PDF missing"')
    expect(html).toContain("MJV-260001")
    expect(html).not.toContain('data-testid="voucher-inquiry-pdf-link-')
  })

  it("renders clickable PDF dot for posted MJV rows without duplicate PDF action", () => {
    const html = renderToStaticMarkup(
      <VoucherInquiryResultsTable
        documents={[postedMjvWithPdfRow]}
        total={1}
        listReturnPath="/finance/vouchers"
      />
    )
    expect(html).toContain('data-testid="voucher-inquiry-pdf-mje-posted-1"')
    expect(html).toContain("/api/finance/manual-journal-entries/mje-posted-1/pdf")
    expect(html).toContain('data-testid="voucher-inquiry-print-mje-posted-1"')
    expect(html).not.toContain('data-testid="voucher-inquiry-pdf-link-')
    expect(html).not.toContain('>PDF</a>')
  })

  it("renders REC and REF POS-origin rows with shop inquiry and print actions", () => {
    const html = renderToStaticMarkup(
      <VoucherInquiryResultsTable
        documents={[recListRow, refListRow]}
        total={2}
        listReturnPath="/finance/vouchers"
      />
    )
    expect(html).toContain("REC-SH001-202606-0001")
    expect(html).toContain("REF-SH001-202606-0002")
    expect(html).toContain("/shop/receipt/sale-1")
    expect(html).toContain("/shop/refund-receipt/refund-1")
    expect(html).toContain('data-testid="voucher-inquiry-print-voucher-rec-1"')
    expect(html).toContain('data-testid="voucher-inquiry-print-voucher-ref-1"')
    expect(html).toContain('data-testid="voucher-inquiry-pdf-voucher-rec-1"')
    expect(html).toContain('aria-label="PDF exists"')
    expect(html).not.toContain('data-testid="voucher-inquiry-pdf-voucher-ref-1"')
    expect(html).not.toContain('data-testid="voucher-inquiry-pdf-link-')
  })

  it("renders PAV, REV, and PCV rows with operational inquiry and print paths", () => {
    const html = renderToStaticMarkup(
      <VoucherInquiryResultsTable
        documents={[postedPavRow, postedRevRow, postedPcvRow]}
        total={3}
        listReturnPath="/finance/vouchers"
      />
    )
    expect(html).toContain("PAV-260001")
    expect(html).toContain("REV-260001")
    expect(html).toContain("PCV-260001")
    expect(html).toContain("/finance/payment-vouchers/pav-1")
    expect(html).toContain("/finance/revenue-vouchers/rev-1")
    expect(html).toContain("/finance/petty-cash-vouchers/pcv-1")
    expect(html).toContain('data-testid="voucher-inquiry-print-voucher-pav-1"')
    expect(html).toContain('data-testid="voucher-inquiry-print-voucher-rev-1"')
    expect(html).toContain('data-testid="voucher-inquiry-print-voucher-pcv-1"')
    expect(html).not.toContain('data-testid="voucher-inquiry-pdf-voucher-pav-1"')
    expect(html).not.toContain('aria-label="PDF missing"')
  })

  it("shows missing PDF dot for posted PAV without archive", () => {
    const html = renderToStaticMarkup(
      <VoucherInquiryPdfIndicator row={postedPavMissingPdfRow} />
    )
    expect(html).toContain(financePdfIndicatorMissing)
    expect(html).toContain('aria-label="PDF missing"')
    expect(html).not.toContain("/api/document-archive/by-document/PAV/pav-1/file")
  })

  it("links posted PAV archive PDF through central vault download", () => {
    const html = renderToStaticMarkup(
      <VoucherInquiryPdfIndicator row={postedPavWithPdfRow} />
    )
    expect(html).toContain(financePdfIndicatorExists)
    expect(html).toContain(
      "/api/document-archive/by-document/PAV/pav-1/file?archiveKind=DOCUMENT_PDF"
    )
  })

  it("uses doc type dropdown with OPB option", () => {
    mockFetchFinanceDocuments.mockResolvedValue({ documents: [], total: 0 })
    const html = renderToStaticMarkup(<VoucherInquiryListPage />)
    expect(html).toContain("Doc Type")
    for (const option of VOUCHER_INQUIRY_REF_TYPE_OPTIONS) {
      expect(html).toContain(option.label)
    }
    expect(VOUCHER_INQUIRY_REF_TYPE_OPTIONS).toHaveLength(10)
    expect(html).toContain("OPB • Opening Balance")
  })
})

describe("FinanceVoucherInquiryDetailView", () => {
  it("shows journal Dr/Cr lines and balanced totals for collector pickup", () => {
    const html = renderToStaticMarkup(
      <FinanceVoucherInquiryDetailView
        voucherId="voucher-pickup-1"
        initialVoucher={collectorPickupVoucher}
      />
    )

    expect(html).toContain('data-testid="voucher-inquiry-detail"')
    expect(html).toContain('data-testid="voucher-inquiry-journal-lines"')
    expect(html).toContain("1031")
    expect(html).toContain("1001")
    expect(html).toContain('data-testid="voucher-inquiry-balanced"')
    expect(html).toContain("COL • Collector Pickup")
    expect(html).toContain("Collector pickup settlement")
  })

  it("shows bank deposit journal lines and PAY document type label", () => {
    const html = renderToStaticMarkup(
      <FinanceVoucherInquiryDetailView
        voucherId="voucher-deposit-1"
        initialVoucher={bankDepositVoucher}
      />
    )

    expect(html).toContain("1021")
    expect(html).toContain("1031")
    expect(html).toContain("PAY • Bank Deposit")
    expect(html).not.toContain("PAY-IN / Bank Deposit")
  })

  it("shows no journal message when journal is missing", () => {
    const html = renderToStaticMarkup(
      <FinanceVoucherInquiryDetailView
        voucherId="voucher-draft-1"
        initialVoucher={{
          ...collectorPickupVoucher,
          id: "voucher-draft-1",
          journal: null,
        }}
      />
    )

    expect(html).toContain('data-testid="voucher-inquiry-no-journal"')
    expect(html).toContain("No journal entry linked.")
  })

  it("uses returnTo for back navigation to collector pickup settlement", () => {
    const returnTo =
      "/finance/pos-settlement/collector-pickup?branchId=branch-1&from=2026-06-01&to=2026-06-30"

    const html = renderToStaticMarkup(
      <FinanceVoucherInquiryDetailView
        voucherId="voucher-pickup-1"
        returnTo={returnTo}
        initialVoucher={collectorPickupVoucher}
      />
    )

    expect(html).toContain(
      'href="/finance/pos-settlement/collector-pickup?branchId=branch-1&amp;from=2026-06-01&amp;to=2026-06-30"'
    )
  })

  it("defaults back link to voucher inquiry list", () => {
    const html = renderToStaticMarkup(
      <FinanceVoucherInquiryDetailView
        voucherId="voucher-pickup-1"
        initialVoucher={collectorPickupVoucher}
      />
    )

    expect(html).toContain('href="/finance/vouchers"')
    expect(html).toContain("← Voucher / Journal Inquiry")
  })
})
