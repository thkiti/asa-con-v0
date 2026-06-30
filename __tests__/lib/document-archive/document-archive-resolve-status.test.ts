import {
  buildDocumentArchiveRefKey,
  resolveDocumentArchiveStatus,
  resolveDocumentArchiveStatuses,
  resolveColBankPayInArchiveAvailable,
  resolvePdfAvailable,
  type VaultArchiveRecord,
} from "@/lib/document-archive"
import { loadVaultArchivesForRefs } from "@/lib/document-archive/vault-lookup"

jest.mock("@/lib/document-archive/vault-lookup", () => ({
  ...jest.requireActual("@/lib/document-archive/vault-lookup"),
  loadVaultArchivesForRefs: jest.fn(),
}))

const mockLoadVault = loadVaultArchivesForRefs as jest.Mock

const activeVaultHit = (
  overrides: Partial<VaultArchiveRecord> = {}
): VaultArchiveRecord => ({
  archiveId: "arch-1",
  archiveKind: "DOCUMENT_PDF",
  status: "ACTIVE",
  storagePath: "documents/mjv/2026/06/MJV-1.pdf",
  storageUrl: null,
  pdfPath: null,
  pdfBlobUrl: null,
  mimeType: "application/pdf",
  ...overrides,
})

describe("resolveDocumentArchiveStatus", () => {
  const originalStorage = process.env.DOCUMENT_ARCHIVE_PDF_STORAGE

  afterEach(() => {
    if (originalStorage === undefined) delete process.env.DOCUMENT_ARCHIVE_PDF_STORAGE
    else process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = originalStorage
    mockLoadVault.mockReset()
  })

  it("returns true from ACTIVE vault link with storagePath", () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    expect(
      resolveDocumentArchiveStatus(
        {
          documentKind: "MJV",
          documentId: "mjv-1",
          archiveKind: "DOCUMENT_PDF",
          workflowStatus: "POSTED",
        },
        activeVaultHit()
      )
    ).toEqual({
      pdfAvailable: true,
      archiveAvailable: null,
      source: "vault",
    })
  })

  it("returns false when link is inactive (no vault hit) and archive is required", () => {
    expect(
      resolveDocumentArchiveStatus({
        documentKind: "MJV",
        documentId: "mjv-1",
        archiveKind: "DOCUMENT_PDF",
        workflowStatus: "POSTED",
        legacyPdfPath: null,
      })
    ).toEqual({
      pdfAvailable: false,
      archiveAvailable: null,
      source: "legacy",
    })
  })

  it("returns null for unposted MJV without archive", () => {
    expect(
      resolvePdfAvailable({
        documentKind: "MJV",
        documentId: "mjv-draft",
        archiveKind: "DOCUMENT_PDF",
        workflowStatus: "DRAFT",
      })
    ).toBe(null)
  })

  it("does not count SUPERSEDED/VOID/FAILED vault rows as available", () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    for (const status of ["SUPERSEDED", "VOID", "FAILED"] as const) {
      expect(
        resolvePdfAvailable(
          {
            documentKind: "MJV",
            documentId: "mjv-1",
            archiveKind: "DOCUMENT_PDF",
            workflowStatus: "POSTED",
          },
          activeVaultHit({ status, storagePath: "documents/mjv/x.pdf" })
        )
      ).toBe(false)
    }
  })

  it("returns null for unsupported kinds such as PAV", () => {
    expect(
      resolvePdfAvailable({
        documentKind: "PAV",
        documentId: "pav-1",
        archiveKind: "DOCUMENT_PDF",
        workflowStatus: "POSTED",
      })
    ).toBe(null)
  })

  it("returns false for posted MJV when required but legacy pdf is missing", () => {
    expect(
      resolvePdfAvailable({
        documentKind: "MJV",
        documentId: "mjv-1",
        archiveKind: "DOCUMENT_PDF",
        workflowStatus: "POSTED",
        legacyPdfPath: null,
      })
    ).toBe(false)
  })

  it("returns true for legacy READY pdfPath on receipt pilot rows", () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    expect(
      resolvePdfAvailable({
        documentKind: "REC",
        documentId: "rec-1",
        archiveKind: "RECEIPT_SLIP",
        legacyDocumentArchive: {
          status: "READY",
          pdfPath: "documents/receipt/2026/06/REC-1.pdf",
          pdfBlobUrl: null,
        },
      })
    ).toBe(true)
  })

  it("returns false for legacy pending receipt archive", () => {
    expect(
      resolvePdfAvailable({
        documentKind: "REC",
        documentId: "rec-1",
        archiveKind: "RECEIPT_SLIP",
        legacyDocumentArchive: {
          status: "PENDING",
          pdfPath: null,
          pdfBlobUrl: null,
        },
      })
    ).toBe(false)
  })

  it("returns null for REF until refund archive is wired", () => {
    expect(
      resolvePdfAvailable({
        documentKind: "REF",
        documentId: "ref-1",
        archiveKind: "REFUND_SLIP",
      })
    ).toBe(null)
  })

  it("returns null for COL pay-in when workflow policy is not required yet", () => {
    expect(
      resolveColBankPayInArchiveAvailable({
        documentKind: "COL",
        documentId: "col-1",
      })
    ).toBe(null)
  })

  it("returns true for COL when BANK_PAY_IN_SLIP vault link exists", () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    expect(
      resolveColBankPayInArchiveAvailable(
        { documentKind: "COL", documentId: "col-1" },
        activeVaultHit({
          archiveKind: "BANK_PAY_IN_SLIP",
          storagePath: "documents/col/pay-in/slip.jpg",
          mimeType: "image/jpeg",
        })
      )
    ).toBe(true)
    expect(
      resolveDocumentArchiveStatus(
        {
          documentKind: "COL",
          documentId: "col-1",
          archiveKind: "BANK_PAY_IN_SLIP",
        },
        activeVaultHit({
          archiveKind: "BANK_PAY_IN_SLIP",
          storagePath: "documents/col/pay-in/slip.jpg",
          mimeType: "image/jpeg",
        })
      ).pdfAvailable
    ).toBe(null)
  })

  it("returns false for COL when required policy is set but link is missing", () => {
    expect(
      resolveColBankPayInArchiveAvailable({
        documentKind: "COL",
        documentId: "col-1",
        requiredPolicy: "required",
      })
    ).toBe(false)
  })
})

describe("resolveDocumentArchiveStatuses batch resolver", () => {
  const originalStorage = process.env.DOCUMENT_ARCHIVE_PDF_STORAGE

  afterEach(() => {
    if (originalStorage === undefined) delete process.env.DOCUMENT_ARCHIVE_PDF_STORAGE
    else process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = originalStorage
    mockLoadVault.mockReset()
  })

  it("returns a map keyed by documentKind:documentId:archiveKind", async () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    const prisma = { documentArchiveLink: { findMany: jest.fn() } }

    mockLoadVault.mockImplementation(async (_prisma, refs) => {
      const map = new Map<string, VaultArchiveRecord>()
      for (const ref of refs) {
        if (ref.documentId === "mjv-1") {
          map.set(
            buildDocumentArchiveRefKey(ref.documentKind, ref.documentId, ref.archiveKind),
            activeVaultHit({ archiveId: "arch-mjv" })
          )
        }
        if (ref.documentId === "col-1" || ref.documentId === "col-2") {
          map.set(
            buildDocumentArchiveRefKey(ref.documentKind, ref.documentId, ref.archiveKind),
            activeVaultHit({
              archiveId: "arch-payin",
              archiveKind: "BANK_PAY_IN_SLIP",
              storagePath: "documents/col/pay-in/shared.jpg",
              mimeType: "image/jpeg",
            })
          )
        }
      }
      return map
    })

    const inputs = [
      {
        documentKind: "MJV" as const,
        documentId: "mjv-1",
        archiveKind: "DOCUMENT_PDF" as const,
        workflowStatus: "POSTED",
      },
      {
        documentKind: "MJV" as const,
        documentId: "mjv-2",
        archiveKind: "DOCUMENT_PDF" as const,
        workflowStatus: "POSTED",
        legacyPdfPath: null,
      },
      {
        documentKind: "COL" as const,
        documentId: "col-1",
        archiveKind: "BANK_PAY_IN_SLIP" as const,
      },
      {
        documentKind: "COL" as const,
        documentId: "col-2",
        archiveKind: "BANK_PAY_IN_SLIP" as const,
      },
    ]

    const result = await resolveDocumentArchiveStatuses(prisma as never, inputs)

    expect(mockLoadVault).toHaveBeenCalledTimes(1)
    expect(result.get("MJV:mjv-1:DOCUMENT_PDF")).toEqual({
      pdfAvailable: true,
      archiveAvailable: null,
      source: "vault",
    })
    expect(result.get("MJV:mjv-2:DOCUMENT_PDF")).toEqual({
      pdfAvailable: false,
      archiveAvailable: null,
      source: "legacy",
    })
    expect(result.get("COL:col-1:BANK_PAY_IN_SLIP")).toEqual({
      pdfAvailable: null,
      archiveAvailable: true,
      source: "vault",
    })
    expect(result.get("COL:col-2:BANK_PAY_IN_SLIP")).toEqual({
      pdfAvailable: null,
      archiveAvailable: true,
      source: "vault",
    })
  })

  it("supports many COL links sharing one archive at resolver level", async () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    const sharedArchive = activeVaultHit({
      archiveId: "shared-payin",
      archiveKind: "BANK_PAY_IN_SLIP",
      storagePath: "documents/col/pay-in/batch-1.pdf",
    })

    mockLoadVault.mockResolvedValue(
      new Map([
        ["COL:col-a:BANK_PAY_IN_SLIP", sharedArchive],
        ["COL:col-b:BANK_PAY_IN_SLIP", sharedArchive],
      ])
    )

    const result = await resolveDocumentArchiveStatuses({ documentArchiveLink: {} } as never, [
      {
        documentKind: "COL",
        documentId: "col-a",
        archiveKind: "BANK_PAY_IN_SLIP",
      },
      {
        documentKind: "COL",
        documentId: "col-b",
        archiveKind: "BANK_PAY_IN_SLIP",
      },
    ])

    expect(result.get("COL:col-a:BANK_PAY_IN_SLIP")?.archiveAvailable).toBe(true)
    expect(result.get("COL:col-b:BANK_PAY_IN_SLIP")?.archiveAvailable).toBe(true)
  })
})

describe("loadVaultArchivesForRefs integration shape", () => {
  it("filters non-readable ACTIVE rows without storage paths", async () => {
    const { loadVaultArchivesForRefs: loadVaultReal } = jest.requireActual<
      typeof import("@/lib/document-archive/vault-lookup")
    >("@/lib/document-archive/vault-lookup")

    const prisma = {
      documentArchiveLink: {
        findMany: jest.fn().mockResolvedValue([
          {
            documentKind: "MJV",
            documentId: "mjv-1",
            archive: {
              id: "arch-empty",
              archiveKind: "DOCUMENT_PDF",
              status: "ACTIVE",
              storagePath: null,
              storageUrl: null,
              pdfPath: null,
              pdfBlobUrl: null,
              mimeType: "application/pdf",
            },
          },
        ]),
      },
    }

    const map = await loadVaultReal(prisma as never, [
      {
        documentKind: "MJV",
        documentId: "mjv-1",
        archiveKind: "DOCUMENT_PDF",
      },
    ])

    expect(map.size).toBe(0)
  })
})
