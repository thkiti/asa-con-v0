import { resolvePdfAvailable } from "@/lib/document-archive/resolve-pdf-available"
import { loadVaultArchivesForRefs } from "@/lib/document-archive/vault-lookup"
import { listStockDocumentsForInquiry } from "@/lib/stock/inquiry/stock-document-inquiry"
import { getStockDocumentInquiryDetail } from "@/lib/stock/inquiry/stock-document-inquiry-detail"

jest.mock("@/lib/document-archive/vault-lookup", () => ({
  ...jest.requireActual("@/lib/document-archive/vault-lookup"),
  loadVaultArchivesForRefs: jest.fn(),
}))

const mockLoadVault = loadVaultArchivesForRefs as jest.Mock

const postedStockRow = {
  id: "stock-posted-1",
  refNo: "ADJ-SH001-202606-0001",
  docType: "ADJUSTMENT" as const,
  status: "POSTED" as const,
  date: new Date("2026-06-15"),
  periodMonth: "2026-06",
  branchId: "branch-1",
  legalEntityCode: "AS",
  createdAt: new Date("2026-06-14"),
  branch: { code: "SH001", name: "Shop 1" },
}

const draftStockRow = {
  ...postedStockRow,
  id: "stock-draft-1",
  refNo: "CNT-SH001-202606-0001",
  status: "DRAFT" as const,
}

describe("stock document inquiry archive mapping", () => {
  const originalStorage = process.env.DOCUMENT_ARCHIVE_PDF_STORAGE

  beforeEach(() => {
    jest.clearAllMocks()
    mockLoadVault.mockResolvedValue(new Map())
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
  })

  afterEach(() => {
    if (originalStorage === undefined) delete process.env.DOCUMENT_ARCHIVE_PDF_STORAGE
    else process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = originalStorage
  })

  it("maps posted stock document without vault archive to pdfAvailable false", async () => {
    const prisma = {
      stockDocument: {
        findMany: jest.fn().mockResolvedValue([postedStockRow]),
      },
      voucher: { findMany: jest.fn().mockResolvedValue([]) },
      documentArchiveLink: {},
    }

    const result = await listStockDocumentsForInquiry(prisma, {
      legalEntityCode: "AS",
    })

    expect(result.documents[0]?.pdfAvailable).toBe(false)
    expect(result.documents[0]?.phaseCode).toBe("ADJ")
  })

  it("maps draft stock document to pdfAvailable null", async () => {
    const prisma = {
      stockDocument: {
        findMany: jest.fn().mockResolvedValue([draftStockRow]),
      },
      voucher: { findMany: jest.fn().mockResolvedValue([]) },
      documentArchiveLink: {},
    }

    const result = await listStockDocumentsForInquiry(prisma, {
      legalEntityCode: "AS",
    })

    expect(result.documents[0]?.pdfAvailable).toBe(null)
    expect(result.documents[0]?.phaseCode).toBe("CNT")
  })

  it("maps posted stock document with active vault archive to pdfAvailable true", async () => {
    mockLoadVault.mockResolvedValue(
      new Map([
        [
          "ADJ:stock-posted-1:DOCUMENT_PDF",
          {
            archiveId: "arch-adj-1",
            archiveKind: "DOCUMENT_PDF",
            status: "ACTIVE",
            storagePath: "documents/adj/2026/ADJ-1.pdf",
            storageUrl: null,
            pdfPath: null,
            pdfBlobUrl: null,
            mimeType: "application/pdf",
          },
        ],
      ])
    )

    const prisma = {
      stockDocument: {
        findMany: jest.fn().mockResolvedValue([postedStockRow]),
      },
      voucher: { findMany: jest.fn().mockResolvedValue([]) },
      documentArchiveLink: {},
    }

    const result = await listStockDocumentsForInquiry(prisma, {
      legalEntityCode: "AS",
    })

    expect(result.documents[0]?.pdfAvailable).toBe(true)
  })

  it("resolves detail pdfAvailable from vault status", async () => {
    mockLoadVault.mockResolvedValue(new Map())
    const prisma = {
      stockDocument: {
        findFirst: jest.fn().mockResolvedValue({
          ...postedStockRow,
          fromLocId: null,
          toLocId: null,
          postedByStaffId: "staff-1",
          confirmedByStaffId: null,
          createdByStaffId: "staff-1",
          submittedAt: null,
          confirmedAt: null,
          postedAt: new Date("2026-06-16"),
          branch: postedStockRow.branch,
          lines: [],
          transactions: [],
        }),
      },
      staff: { findMany: jest.fn().mockResolvedValue([{ staffId: "staff-1", name: "Staff" }]) },
      voucher: { findFirst: jest.fn().mockResolvedValue(null) },
      stockTransaction: { findMany: jest.fn().mockResolvedValue([]) },
      documentArchiveLink: {},
    }

    const detail = await getStockDocumentInquiryDetail(prisma, "stock-posted-1", "AS")
    expect(detail?.pdfAvailable).toBe(false)
    expect(
      resolvePdfAvailable({
        documentKind: "ADJ",
        documentId: "stock-posted-1",
        archiveKind: "DOCUMENT_PDF",
        workflowStatus: "POSTED",
      })
    ).toBe(false)
  })
})
