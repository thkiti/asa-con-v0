import { listFinanceDocuments } from "@/lib/finance/inquiry/finance-document-inquiry"
import { listFinanceVouchers } from "@/lib/finance/inquiry/voucher-list"
import { listUnpostedOperationalDocuments } from "@/lib/finance/inquiry/unposted-operational-inquiry"

jest.mock("@/lib/finance/inquiry/voucher-list", () => ({
  listFinanceVouchers: jest.fn(),
}))

jest.mock("@/lib/finance/inquiry/unposted-operational-inquiry", () => ({
  listUnpostedOperationalDocuments: jest.fn(),
}))

const mockListFinanceVouchers = listFinanceVouchers as jest.Mock
const mockListUnposted = listUnpostedOperationalDocuments as jest.Mock

const postedVoucherRow = {
  id: "voucher-1",
  voucherNo: "V-2026-06-00001",
  date: "2026-06-14T00:00:00.000Z",
  legalEntityCode: "AS",
  periodKey: "2026-06",
  refType: "MANUAL_JOURNAL",
  refId: "mje-1",
  refNo: "MJV-260001",
  description: "Manual journal",
  status: "POSTED",
  totalDebit: "1000",
  totalCredit: "1000",
  branchId: "branch-1",
  branchCode: "SH001",
  branchName: "Shop 1",
  journalEntryId: "journal-1",
  amount: "1000",
  documentTypeCode: "MJV",
  documentNo: "MJV-260001",
  pdfAvailable: true,
}

describe("listFinanceDocuments", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockListFinanceVouchers.mockResolvedValue({ vouchers: [], total: 0 })
    mockListUnposted.mockResolvedValue({ documents: [], total: 0 })
  })

  it("merges posted vouchers and unposted operational documents", async () => {
    mockListFinanceVouchers.mockResolvedValue({
      vouchers: [postedVoucherRow],
      total: 1,
    })
    mockListUnposted.mockResolvedValue({
      documents: [
        {
          id: "mje-draft-1",
          rowKind: "unposted",
          legalEntityCode: "AS",
          documentTypeCode: "MJV",
          documentNo: "MJV-260002",
          voucherNo: null,
          date: "2026-06-12T00:00:00.000Z",
          periodKey: null,
          branchId: "branch-1",
          branchCode: "SH001",
          branchName: "Shop 1",
          status: "DRAFT",
          amount: "500",
          journalEntryId: null,
          operationalDocumentId: "mje-draft-1",
          pdfAvailable: false,
          inquiryPath: "/finance/manual-journal-entries/mje-draft-1",
          printPath: null,
        },
      ],
      total: 1,
    })

    const prisma = { mocked: true }
    const result = await listFinanceDocuments(prisma as never, {
      legalEntityCode: "AS",
      postingState: "all",
    })

    expect(result.total).toBe(2)
    expect(result.documents).toHaveLength(2)
    expect(result.documents.map((row) => row.rowKind)).toEqual(["posted", "unposted"])
  })

  it("returns only unposted rows when postingState is unposted", async () => {
    mockListUnposted.mockResolvedValue({
      documents: [
        {
          id: "mje-draft-1",
          rowKind: "unposted",
          legalEntityCode: "AS",
          documentTypeCode: "MJV",
          documentNo: "MJV-260002",
          voucherNo: null,
          date: "2026-06-12T00:00:00.000Z",
          periodKey: null,
          branchId: "branch-1",
          branchCode: "SH001",
          branchName: "Shop 1",
          status: "DRAFT",
          amount: "500",
          journalEntryId: null,
          operationalDocumentId: "mje-draft-1",
          pdfAvailable: false,
          inquiryPath: "/finance/manual-journal-entries/mje-draft-1",
          printPath: null,
        },
      ],
      total: 1,
    })

    const result = await listFinanceDocuments({} as never, {
      legalEntityCode: "AS",
      postingState: "unposted",
    })

    expect(mockListFinanceVouchers).not.toHaveBeenCalled()
    expect(result.documents).toHaveLength(1)
    expect(result.documents[0]?.status).toBe("DRAFT")
  })
})
