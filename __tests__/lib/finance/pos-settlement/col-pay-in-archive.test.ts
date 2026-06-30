import { PaymentEvidenceStatus } from "@/generated/prisma/client"
import { resolveColPayInArchiveWorkflowStatus } from "@/lib/document-archive/col-pay-in-workflow"
import { resolveColBankPayInArchiveAvailable } from "@/lib/document-archive/resolve-col-archive-available"
import {
  assertPayInVaultEvidenceForPosting,
  isPayInEvidenceReadyForPosting,
  uploadPayInVaultEvidence,
} from "@/lib/finance/pos-settlement/pay-in-evidence-vault"
import { PosSettlementErrorCodes } from "@/lib/finance/pos-settlement/pos-settlement-errors"
import { assertMimeTypeAllowedForArchiveKind } from "@/lib/document-archive/validation"

jest.mock("@/lib/document-archive/upload-archive", () => ({
  uploadDocumentArchive: jest.fn().mockResolvedValue({
    archiveId: "arch-payin-1",
    linkIds: ["link-1", "link-2"],
    storagePath: "documents/vault/bank_pay_in_slip/AS/2026/06/a.jpg",
    storageUrl: null,
  }),
}))

jest.mock("@/lib/document-archive/vault-lookup", () => ({
  ...jest.requireActual("@/lib/document-archive/vault-lookup"),
  loadVaultArchivesForRefs: jest.fn(),
}))

import { loadVaultArchivesForRefs } from "@/lib/document-archive/vault-lookup"

const mockLoadVault = loadVaultArchivesForRefs as jest.Mock

describe("COL pay-in archive workflow", () => {
  const originalStorage = process.env.DOCUMENT_ARCHIVE_PDF_STORAGE

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    mockLoadVault.mockResolvedValue(new Map())
  })

  afterEach(() => {
    if (originalStorage === undefined) delete process.env.DOCUMENT_ARCHIVE_PDF_STORAGE
    else process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = originalStorage
  })

  it("maps pickup posted + deposit not posted to awaiting pay-in workflow", () => {
    expect(
      resolveColPayInArchiveWorkflowStatus({
        pickupStatus: "POSTED",
        depositStatus: "NOT_POSTED",
      })
    ).toBe("COL_AWAITING_PAY_IN")
  })

  it("returns archiveAvailable false when COL is ready but evidence is missing", () => {
    expect(
      resolveColBankPayInArchiveAvailable({
        documentKind: "COL",
        documentId: "col-1",
        workflowStatus: "COL_AWAITING_PAY_IN",
      })
    ).toBe(false)
  })

  it("returns archiveAvailable true when active vault link exists", () => {
    mockLoadVault.mockResolvedValue(
      new Map([
        [
          "COL:col-1:BANK_PAY_IN_SLIP",
          {
            archiveId: "arch-1",
            archiveKind: "BANK_PAY_IN_SLIP",
            status: "ACTIVE",
            storagePath: "documents/vault/bank_pay_in_slip/AS/2026/06/a.jpg",
            storageUrl: null,
            pdfPath: null,
            pdfBlobUrl: null,
            mimeType: "image/jpeg",
          },
        ],
      ])
    )

    return expect(
      import("@/lib/finance/pos-settlement/pay-in-evidence-vault").then(
        ({ resolveColPayInArchiveContext }) =>
          resolveColPayInArchiveContext(
            { documentArchiveLink: {}, documentArchive: {}, $transaction: {} } as never,
            {
              collectorReportId: "col-1",
              collectNo: "COL-001",
              pickupStatus: "POSTED",
              depositStatus: "NOT_POSTED",
            }
          )
      )
    ).resolves.toMatchObject({
      archiveAvailable: true,
      evidenceDownloadPath:
        "/api/document-archive/by-document/COL/col-1/file?archiveKind=BANK_PAY_IN_SLIP",
    })
  })

  it("accepts PDF/JPEG/PNG and rejects other MIME types for BANK_PAY_IN_SLIP", () => {
    expect(() =>
      assertMimeTypeAllowedForArchiveKind("BANK_PAY_IN_SLIP", "application/pdf")
    ).not.toThrow()
    expect(() =>
      assertMimeTypeAllowedForArchiveKind("BANK_PAY_IN_SLIP", "image/jpeg")
    ).not.toThrow()
    expect(() =>
      assertMimeTypeAllowedForArchiveKind("BANK_PAY_IN_SLIP", "image/png")
    ).not.toThrow()
    expect(() =>
      assertMimeTypeAllowedForArchiveKind("BANK_PAY_IN_SLIP", "text/plain")
    ).toThrow()
  })

  it("uploads one archive with multiple COL links", async () => {
    const result = await uploadPayInVaultEvidence(
      { documentArchive: {}, documentArchiveLink: {}, $transaction: jest.fn() } as never,
      {
        legalEntityCode: "AS",
        archivedByStaffId: "staff-1",
        fileBuffer: Buffer.from("bytes"),
        mimeType: "image/jpeg",
        links: [
          {
            collectorReportId: "col-a",
            collectNo: "COL-A",
            branchId: "branch-1",
          },
          {
            collectorReportId: "col-b",
            collectNo: "COL-B",
            branchId: "branch-1",
          },
        ],
      }
    )

    expect(result.archiveId).toBe("arch-payin-1")
    expect(result.linkIds).toHaveLength(2)
  })

  it("rejects POST PAY-IN when vault and legacy evidence are missing", async () => {
    await expect(
      assertPayInVaultEvidenceForPosting(
        { documentArchiveLink: {}, documentArchive: {}, $transaction: {} } as never,
        {
          collectorReportId: "col-1",
          collectNo: "COL-001",
          pickupStatus: "POSTED",
          depositStatus: "NOT_POSTED",
          legacyEvidence: null,
        }
      )
    ).rejects.toMatchObject({ code: PosSettlementErrorCodes.PAY_IN_SLIP_REQUIRED })
  })

  it("allows POST PAY-IN readiness from legacy uploaded evidence", () => {
    expect(
      isPayInEvidenceReadyForPosting({
        archiveAvailable: false,
        legacyEvidence: { status: PaymentEvidenceStatus.UPLOADED },
      })
    ).toBe(true)
  })

  it("allows POST PAY-IN readiness from vault archiveAvailable true", () => {
    expect(
      isPayInEvidenceReadyForPosting({
        archiveAvailable: true,
        legacyEvidence: null,
      })
    ).toBe(true)
  })

  it("passes vault evidence assert when active archive link exists", async () => {
    mockLoadVault.mockResolvedValue(
      new Map([
        [
          "COL:col-1:BANK_PAY_IN_SLIP",
          {
            archiveId: "arch-1",
            archiveKind: "BANK_PAY_IN_SLIP",
            status: "ACTIVE",
            storagePath: "documents/vault/bank_pay_in_slip/AS/2026/06/a.jpg",
            storageUrl: null,
            pdfPath: null,
            pdfBlobUrl: null,
            mimeType: "image/jpeg",
          },
        ],
      ])
    )

    await expect(
      assertPayInVaultEvidenceForPosting(
        { documentArchiveLink: {}, documentArchive: {}, $transaction: {} } as never,
        {
          collectorReportId: "col-1",
          collectNo: "COL-001",
          pickupStatus: "POSTED",
          depositStatus: "NOT_POSTED",
          legacyEvidence: null,
        }
      )
    ).resolves.toMatchObject({ archiveAvailable: true })
  })
})
