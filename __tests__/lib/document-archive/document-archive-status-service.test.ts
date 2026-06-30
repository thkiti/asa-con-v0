import {
  getDocumentArchiveStatus,
} from "@/lib/document-archive/get-archive-status"
import { loadVaultArchivesForRefs } from "@/lib/document-archive/vault-lookup"
import { resolveDocumentArchiveStatuses } from "@/lib/document-archive/resolve-status"

jest.mock("@/lib/document-archive/vault-lookup", () => ({
  ...jest.requireActual("@/lib/document-archive/vault-lookup"),
  loadVaultArchivesForRefs: jest.fn(),
}))

const mockLoadVault = loadVaultArchivesForRefs as jest.Mock

describe("getDocumentArchiveStatus service", () => {
  beforeEach(() => {
    mockLoadVault.mockReset()
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
  })

  it("returns resolver result with archive metadata when vault row exists", async () => {
    mockLoadVault.mockResolvedValue(
      new Map([
        [
          "MJV:mjv-1:DOCUMENT_PDF",
          {
            archiveId: "arch-1",
            archiveKind: "DOCUMENT_PDF",
            status: "ACTIVE",
            storagePath: "documents/vault/document_pdf/AS/2026/06/a.pdf",
            storageUrl: null,
            pdfPath: "documents/vault/document_pdf/AS/2026/06/a.pdf",
            pdfBlobUrl: null,
            mimeType: "application/pdf",
          },
        ],
      ])
    )

    const db = {
      documentArchiveLink: { findMany: jest.fn() },
      documentArchive: {
        findFirst: jest.fn().mockResolvedValue({
          id: "arch-1",
          archiveKind: "DOCUMENT_PDF",
          legalEntityCode: "AS",
          storagePath: "documents/vault/document_pdf/AS/2026/06/a.pdf",
          storageUrl: null,
          pdfPath: "documents/vault/document_pdf/AS/2026/06/a.pdf",
          pdfBlobUrl: null,
          fileName: "a.pdf",
          mimeType: "application/pdf",
          sizeBytes: 128,
          archivedAt: new Date("2026-06-30T10:00:00.000Z"),
          status: "ACTIVE",
        }),
      },
    }

    const status = await getDocumentArchiveStatus(db as never, {
      documentKind: "MJV",
      documentId: "mjv-1",
      archiveKind: "DOCUMENT_PDF",
      workflowStatus: "POSTED",
    })

    expect(status.pdfAvailable).toBe(true)
    expect(status.source).toBe("vault")
    expect(status.archiveId).toBe("arch-1")
    expect(status.fileName).toBe("a.pdf")
    expect(status.mimeType).toBe("application/pdf")
    expect(status.sizeBytes).toBe(128)
  })

  it("batch resolver and status agree for uploaded COL refs", async () => {
    const vaultHit = {
      archiveId: "payin-1",
      archiveKind: "BANK_PAY_IN_SLIP" as const,
      status: "ACTIVE",
      storagePath: "documents/vault/bank_pay_in_slip/AS/2026/06/slip.jpg",
      storageUrl: null,
      pdfPath: "documents/vault/bank_pay_in_slip/AS/2026/06/slip.jpg",
      pdfBlobUrl: null,
      mimeType: "image/jpeg",
    }
    mockLoadVault.mockResolvedValue(
      new Map([
        ["COL:col-1:BANK_PAY_IN_SLIP", vaultHit],
        ["COL:col-2:BANK_PAY_IN_SLIP", vaultHit],
      ])
    )

    const inputs = [
      {
        documentKind: "COL" as const,
        documentId: "col-1",
        archiveKind: "BANK_PAY_IN_SLIP" as const,
        requiredPolicy: "required" as const,
      },
      {
        documentKind: "COL" as const,
        documentId: "col-2",
        archiveKind: "BANK_PAY_IN_SLIP" as const,
        requiredPolicy: "required" as const,
      },
    ]

    const batch = await resolveDocumentArchiveStatuses({ documentArchiveLink: {} } as never, inputs)
    expect(batch.get("COL:col-1:BANK_PAY_IN_SLIP")?.archiveAvailable).toBe(true)
    expect(batch.get("COL:col-2:BANK_PAY_IN_SLIP")?.archiveAvailable).toBe(true)
  })
})
