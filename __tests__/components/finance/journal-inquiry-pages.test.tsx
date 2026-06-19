import { renderToStaticMarkup } from "react-dom/server"
import { JournalEntryInquiryView } from "@/components/finance/JournalEntryInquiryView"
import { VoucherDetailView } from "@/components/finance/VoucherDetailView"

jest.mock("@/lib/finance-ui/journal-entries", () => ({
  fetchJournalInquiry: jest.fn(),
  reverseJournal: jest.fn(),
}))

jest.mock("@/lib/finance-ui/fetchers", () => ({
  fetchVoucherById: jest.fn(),
}))

import { fetchJournalInquiry } from "@/lib/finance-ui/journal-entries"
import { fetchVoucherById } from "@/lib/finance-ui/fetchers"

const mockFetchJournalInquiry = fetchJournalInquiry as jest.Mock
const mockFetchVoucherById = fetchVoucherById as jest.Mock

const opbDocumentHeader = {
  legalEntityCode: "AD",
  entryType: "OPENING_BALANCE",
  documentNo: "OPB-260001",
  entryDate: "2026-01-01",
  status: "POSTED",
  description: "OPENING BALANCE 2026",
  createdAt: "2026-06-14T08:00:00.000Z",
  submittedAt: "2026-06-14T09:00:00.000Z",
  confirmedAt: "2026-06-14T10:00:00.000Z",
  postedAt: "2026-06-18T09:59:00.000Z",
  cancelledAt: null,
}

const opbJournalFixture = {
  id: "journal-1",
  voucherId: "voucher-1",
  voucherNo: "V-2026-01-00001",
  refType: "OPENING_BALANCE_JOURNAL",
  refId: "entry-1",
  refNo: "OPB-260001",
  description: "OPENING BALANCE 2026",
  date: "2026-01-01T00:00:00.000Z",
  branchId: "branch-1",
  periodId: "period-1",
  postedAt: "2026-06-18T09:59:00.000Z",
  reversalOfJournalEntryId: null,
  isReversal: false,
  isReversed: false,
  reverses: null,
  reversedBy: null,
  documentHeader: opbDocumentHeader,
  lines: [
    {
      id: "line-1",
      lineNo: 1,
      accountCode: "1100",
      accountName: "Cash",
      debit: "100",
      credit: "0",
      memo: null,
    },
  ],
}

describe("JournalEntryInquiryView", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchJournalInquiry.mockResolvedValue(opbJournalFixture)
  })

  it("renders operational document shell with canonical header and flat body", () => {
    const html = renderToStaticMarkup(
      <JournalEntryInquiryView
        journalEntryId="journal-1"
        initialJournal={opbJournalFixture}
      />
    )
    expect(html).toContain('data-testid="finance-document-container"')
    expect(html).toContain('data-testid="journal-entry-inquiry"')
    expect(html).toContain('data-testid="finance-document-header"')
    expect(html).toContain("ASAD • OPENING BALANCE")
    expect(html).toContain("OPB-260001")
    expect(html).toContain("Period: 2026-01")
    expect(html).toContain("Status: POSTED")
    expect(html).toContain('data-testid="finance-document-accounting-information"')
    expect(html).toContain('data-testid="finance-accounting-voucher-no"')
    expect(html).toContain("V-2026-01-00001")
    expect(html).toContain("OPENING_BALANCE_JOURNAL")
    expect(html).toContain('data-testid="journal-inquiry-lineage"')
    expect(html).not.toContain("Journal header")
    expect(html).not.toContain('data-testid="journal-inquiry-dashboard-title"')
    expect(html).not.toContain("<h2>Journal lines</h2>")
    expect(html).not.toMatch(/journal-inquiry-lineage[^>]*rounded border border-zinc-200 p-4/)
  })

  it("keeps dashboard inquiry layout when documentHeader is missing", () => {
    const html = renderToStaticMarkup(
      <JournalEntryInquiryView
        journalEntryId="journal-2"
        initialJournal={{
          ...opbJournalFixture,
          id: "journal-2",
          refType: "POS_SALE",
          documentHeader: null,
        }}
      />
    )
    expect(html).not.toContain('data-testid="finance-document-container"')
    expect(html).toContain('data-testid="journal-inquiry-dashboard-title"')
    expect(html).toContain("Journal inquiry")
    expect(html).toContain("rounded border border-zinc-200 p-4")
  })
})

describe("VoucherDetailView", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchVoucherById.mockResolvedValue({
      voucher: {
        id: "voucher-1",
        voucherNo: "V-2026-01-00001",
        legalEntityCode: "AD",
        date: "2026-01-01T00:00:00.000Z",
        status: "POSTED",
        branchId: "branch-1",
        refType: "OPENING_BALANCE_JOURNAL",
        refId: "entry-1",
        refNo: "OPB-260001",
        description: "OPENING BALANCE 2026",
        postedAt: "2026-06-18T09:59:00.000Z",
        documentHeader: opbDocumentHeader,
        lines: [],
        journal: {
          id: "journal-1",
          postedAt: "2026-06-18T09:59:00.000Z",
          lines: [],
        },
      },
    })
  })

  it("renders operational document shell without trace dashboard card", () => {
    const html = renderToStaticMarkup(
      <VoucherDetailView
        voucherId="voucher-1"
        initialVoucher={{
          id: "voucher-1",
          voucherNo: "V-2026-01-00001",
          legalEntityCode: "AD",
          date: "2026-01-01T00:00:00.000Z",
          status: "POSTED",
          branchId: "branch-1",
          refType: "OPENING_BALANCE_JOURNAL",
          refId: "entry-1",
          refNo: "OPB-260001",
          description: "OPENING BALANCE 2026",
          postedAt: "2026-06-18T09:59:00.000Z",
          documentHeader: opbDocumentHeader,
          lines: [],
          journal: {
            id: "journal-1",
            postedAt: "2026-06-18T09:59:00.000Z",
            lines: [],
          },
        }}
      />
    )
    expect(html).toContain('data-testid="finance-document-container"')
    expect(html).toContain('data-testid="voucher-detail-view"')
    expect(html).toContain('data-testid="finance-document-header"')
    expect(html).toContain("OPB-260001")
    expect(html).not.toContain("Voucher V-2026-01-00001")
    expect(html).toContain('data-testid="finance-accounting-voucher-no"')
    expect(html).toContain("V-2026-01-00001")
    expect(html).toContain('data-testid="voucher-journal-link"')
    expect(html).toContain('data-testid="voucher-detail-technical-metadata"')
    expect(html).not.toContain('data-testid="voucher-trace-dashboard-title"')
    expect(html).not.toContain("Finance trace view")
  })

  it("keeps trace dashboard layout when documentHeader is missing", () => {
    const html = renderToStaticMarkup(
      <VoucherDetailView
        voucherId="voucher-2"
        initialVoucher={{
          id: "voucher-2",
          voucherNo: "V-2026-06-00002",
          legalEntityCode: "AS",
          date: "2026-06-14T00:00:00.000Z",
          status: "POSTED",
          branchId: "branch-1",
          refType: "POS_SALE",
          refId: "sale-1",
          refNo: null,
          description: null,
          postedAt: "2026-06-14T15:00:00.000Z",
          documentHeader: null,
          lines: [],
          journal: null,
        }}
      />
    )
    expect(html).not.toContain('data-testid="finance-document-container"')
    expect(html).toContain('data-testid="voucher-trace-dashboard-title"')
    expect(html).toContain("Finance trace view")
    expect(html).toContain("rounded border border-zinc-200 bg-white p-4")
  })
})
