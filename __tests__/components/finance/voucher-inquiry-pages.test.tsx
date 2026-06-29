import { renderToStaticMarkup } from "react-dom/server"
import FinanceVoucherInquiryPage from "@/app/(main)/finance/vouchers/page"
import { FinanceVoucherInquiryDetailView } from "@/components/finance/FinanceVoucherInquiryDetailView"
import { VoucherInquiryListPage, VoucherInquiryResultsTable } from "@/components/finance/VoucherInquiryListPage"
import { VOUCHER_INQUIRY_REF_TYPE_OPTIONS } from "@/lib/finance/inquiry/voucher-document-types"
import { financeFilterSelect } from "@/lib/finance-ui/finance-visual-classes"
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
    new URLSearchParams("periodKey=2026-06&from=2026-06-01&to=2026-06-30&refType=MJV"),
}))

jest.mock("@/lib/finance-ui/voucher-inquiry", () => {
  const actual = jest.requireActual("@/lib/finance-ui/voucher-inquiry")
  return {
    ...actual,
    fetchFinanceVouchers: jest.fn(),
  }
})

jest.mock("@/lib/finance-ui/fetchers", () => ({
  fetchVoucherById: jest.fn(),
}))

import { fetchFinanceVouchers } from "@/lib/finance-ui/voucher-inquiry"

const mockFetchFinanceVouchers = fetchFinanceVouchers as jest.Mock

const listRow = {
  id: "voucher-pickup-1",
  voucherNo: "V-2026-06-00001",
  date: "2026-06-14T00:00:00.000Z",
  legalEntityCode: "AS",
  periodKey: "2026-06",
  refType: FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP,
  refNo: "COL-260001",
  description: "Collector pickup settlement",
  status: "POSTED",
  totalDebit: "5000",
  totalCredit: "5000",
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
    mockFetchFinanceVouchers.mockResolvedValue({ vouchers: [listRow], total: 1 })
  })

  it("renders simplified filters in finance page shell", () => {
    const html = renderToStaticMarkup(<FinanceVoucherInquiryPage />)
    expect(html).toContain('data-testid="finance-admin-page"')
    expect(html).toContain('data-testid="app-page-container"')
    expect(html).toContain('data-testid="voucher-inquiry-filters"')
    expect(html).toContain("voucher-inquiry-filter-bar")
    expect(html).toContain("voucher-inquiry-filter-period")
    expect(html).toContain("voucher-inquiry-filter-ref-type")
    expect(html).toContain('data-testid="voucher-inquiry-filter-document-type"')
    expect(html).toContain(financeFilterSelect)
    expect(html).toContain("Document Type")
    expect(html).not.toContain(">Ref Type<")
    expect(html).toContain('placeholder="0001"')
    expect(html).not.toContain('placeholder="V-2026-"')
    expect(html).toContain('data-testid="voucher-inquiry-filter-period"')
    expect(html).toContain('data-testid="voucher-inquiry-filter-from"')
    expect(html).toContain('data-testid="voucher-inquiry-filter-to"')
    expect(html).toContain('data-testid="voucher-inquiry-filter-voucher-no"')
    expect(html).toContain('data-testid="voucher-inquiry-search"')
    expect(html).toContain('data-testid="voucher-inquiry-clear"')
    expect(html).toContain("voucher-inquiry-filter-actions")
    expect(html).not.toContain('data-testid="voucher-inquiry-filter-ref-no"')
    expect(html).not.toContain('placeholder="COL-"')
    const filtersIndex = html.indexOf('data-testid="voucher-inquiry-filters"')
    const searchIndex = html.indexOf('data-testid="voucher-inquiry-search"')
    const clearIndex = html.indexOf('data-testid="voucher-inquiry-clear"')
    const voucherNoIndex = html.indexOf('data-testid="voucher-inquiry-filter-voucher-no"')
    expect(filtersIndex).toBeGreaterThan(-1)
    expect(searchIndex).toBeGreaterThan(voucherNoIndex)
    expect(clearIndex).toBeGreaterThan(searchIndex)
  })
})

describe("VoucherInquiryListPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchFinanceVouchers.mockResolvedValue({ vouchers: [listRow], total: 1 })
  })

  it("renders simplified table columns without debit, credit, or description", () => {
    const html = renderToStaticMarkup(
      <VoucherInquiryResultsTable
        vouchers={[listRow]}
        total={1}
        rowOffset={0}
        listReturnPath="/finance/vouchers"
      />
    )
    expect(html).toContain('data-testid="voucher-inquiry-table"')
    expect(html).toContain("No.")
    expect(html).toContain("Voucher No")
    expect(html).toContain("Ref No")
    expect(html).toContain("COL-260001")
    expect(html).toContain("COL • Collector Pickup")
    expect(html).not.toContain("Entity")
    expect(html).not.toContain("Description")
    expect(html).not.toContain("Debit")
    expect(html).not.toContain("Credit")
    expect(html).toContain('data-testid="voucher-inquiry-row-voucher-pickup-1"')
    expect(html).toContain("14/06/2026")
    expect(html).not.toContain("Jun 14")
  })

  it("uses document type dropdown with full fixed option list", () => {
    mockFetchFinanceVouchers.mockResolvedValue({ vouchers: [], total: 0 })
    const html = renderToStaticMarkup(<VoucherInquiryListPage />)
    expect(html).toContain("flex-nowrap")
    expect(html).toContain("voucher-inquiry-filter-actions")
    expect(html).toContain("Document Type")
    expect(html).toContain(financeFilterSelect)
    expect(html).not.toContain(">Ref Type<")
    expect(html).toContain('placeholder="0001"')
    for (const option of VOUCHER_INQUIRY_REF_TYPE_OPTIONS) {
      expect(html).toContain(option.label)
    }
    expect(VOUCHER_INQUIRY_REF_TYPE_OPTIONS).toHaveLength(9)
    expect(html).not.toContain("PAY-IN / Bank Deposit")
    expect(html).not.toContain('placeholder="POS_SETTLEMENT_')
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
