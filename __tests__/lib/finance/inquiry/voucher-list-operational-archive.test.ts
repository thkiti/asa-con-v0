import { Prisma } from "@/generated/prisma/client"
import { listFinanceVouchers } from "@/lib/finance/inquiry/voucher-list"
import { loadVaultArchivesForRefs } from "@/lib/document-archive/vault-lookup"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

jest.mock("@/lib/document-archive/vault-lookup", () => ({
  ...jest.requireActual("@/lib/document-archive/vault-lookup"),
  loadVaultArchivesForRefs: jest.fn(),
}))

const mockLoadVault = loadVaultArchivesForRefs as jest.Mock

const pavRow = {
  id: "voucher-pav-1",
  voucherNo: "V-2026-06-00020",
  date: new Date("2026-06-16"),
  legalEntityCode: "AS",
  refType: FINANCE_REF_TYPES.PAYMENT_VOUCHER,
  refId: "pav-1",
  refNo: "PAV-260001",
  description: "Payment",
  status: "POSTED",
  branchId: "branch-1",
  branch: { code: "SH001", name: "Shop 1" },
  period: { periodKey: "2026-06" },
  journalEntry: {
    id: "journal-pav-1",
    lines: [
      { debit: new Prisma.Decimal("1500"), credit: new Prisma.Decimal("0") },
      { debit: new Prisma.Decimal("0"), credit: new Prisma.Decimal("1500") },
    ],
  },
  lines: [],
  manualJournalEntryPosted: null,
  paymentVoucherPosted: { entryNo: "PAV-260001" },
  revenueVoucherPosted: null,
  pettyCashVoucherPosted: null,
}

describe("listFinanceVouchers operational voucher archive mapping", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLoadVault.mockResolvedValue(new Map())
  })

  it("maps posted PAV without vault archive to pdfAvailable false", async () => {
    const findMany = jest.fn().mockResolvedValue([pavRow])
    const count = jest.fn().mockResolvedValue(1)
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique: jest.fn() },
      documentArchiveLink: {},
    }

    const result = await listFinanceVouchers(prisma, { legalEntityCode: "AS" })

    expect(mockLoadVault).toHaveBeenCalledWith(
      prisma,
      expect.arrayContaining([
        expect.objectContaining({
          documentKind: "PAV",
          documentId: "pav-1",
          archiveKind: "DOCUMENT_PDF",
        }),
      ])
    )
    expect(result.vouchers[0]?.pdfAvailable).toBe(false)
    expect(result.vouchers[0]?.documentTypeCode).toBe("PAV")
  })

  it("maps posted PAV with active vault archive to pdfAvailable true", async () => {
    mockLoadVault.mockResolvedValue(
      new Map([
        [
          "PAV:pav-1:DOCUMENT_PDF",
          {
            archiveId: "arch-pav-1",
            archiveKind: "DOCUMENT_PDF",
            status: "ACTIVE",
            storagePath: "documents/pav/2026/PAV-260001.pdf",
            storageUrl: null,
            pdfPath: null,
            pdfBlobUrl: null,
            mimeType: "application/pdf",
          },
        ],
      ])
    )
    const findMany = jest.fn().mockResolvedValue([pavRow])
    const count = jest.fn().mockResolvedValue(1)
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique: jest.fn() },
      documentArchiveLink: {},
    }

    const result = await listFinanceVouchers(prisma, { legalEntityCode: "AS" })
    expect(result.vouchers[0]?.pdfAvailable).toBe(true)
  })
})
