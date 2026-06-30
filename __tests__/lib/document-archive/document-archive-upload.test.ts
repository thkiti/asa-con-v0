jest.mock("@/lib/document-archive/storage/store-archive-file", () => ({
  storeDocumentArchiveFile: jest.fn(),
}))

import { storeDocumentArchiveFile } from "@/lib/document-archive/storage/store-archive-file"
import { uploadDocumentArchive } from "@/lib/document-archive/upload-archive"
import {
  assertMimeTypeAllowedForArchiveKind,
  parseDocumentArchiveKind,
  parseDocumentArchiveLinks,
  parseDocumentKind,
} from "@/lib/document-archive/validation"
import { DocumentArchiveErrorCodes } from "@/lib/document-archive/errors"
import { resolveDocumentArchiveStatus } from "@/lib/document-archive/resolve-status"
import type { VaultArchiveRecord } from "@/lib/document-archive/resolve-status-types"

const mockStore = storeDocumentArchiveFile as jest.Mock

function createMockDb() {
  const linkCreates: unknown[] = []
  const archiveCreate = jest.fn().mockImplementation(async ({ data }) => ({
    id: "archive-1",
    ...data,
  }))
  const linkCreate = jest.fn().mockImplementation(async ({ data }) => {
    linkCreates.push(data)
    return { id: `link-${linkCreates.length}` }
  })

  const tx = {
    documentArchive: { create: archiveCreate },
    documentArchiveLink: { create: linkCreate },
  }

  return {
    db: {
      $transaction: jest.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
      documentArchive: { create: archiveCreate },
      documentArchiveLink: { create: linkCreate },
    },
    archiveCreate,
    linkCreate,
    linkCreates,
  }
}

describe("document archive validation", () => {
  it("parses valid documentKind and archiveKind", () => {
    expect(parseDocumentKind("MJV")).toBe("MJV")
    expect(parseDocumentArchiveKind("BANK_PAY_IN_SLIP")).toBe("BANK_PAY_IN_SLIP")
  })

  it("rejects invalid documentKind and archiveKind", () => {
    expect(() => parseDocumentKind("NOT_A_KIND")).toThrow(
      expect.objectContaining({ code: DocumentArchiveErrorCodes.INVALID_KIND })
    )
    expect(() => parseDocumentArchiveKind("BAD")).toThrow(
      expect.objectContaining({ code: DocumentArchiveErrorCodes.INVALID_KIND })
    )
  })

  it("rejects invalid mime for DOCUMENT_PDF and accepts pay-in image types", () => {
    expect(() =>
      assertMimeTypeAllowedForArchiveKind("DOCUMENT_PDF", "image/png")
    ).toThrow(expect.objectContaining({ code: DocumentArchiveErrorCodes.INVALID_MIME_TYPE }))
    expect(() =>
      assertMimeTypeAllowedForArchiveKind("BANK_PAY_IN_SLIP", "image/jpeg")
    ).not.toThrow()
    expect(() =>
      assertMimeTypeAllowedForArchiveKind("BANK_PAY_IN_SLIP", "image/png")
    ).not.toThrow()
  })

  it("requires at least one link", () => {
    expect(() => parseDocumentArchiveLinks("[]")).toThrow(
      expect.objectContaining({ code: DocumentArchiveErrorCodes.LINKS_REQUIRED })
    )
  })
})

describe("uploadDocumentArchive", () => {
  beforeEach(() => {
    mockStore.mockReset()
    mockStore.mockResolvedValue({
      storagePath: "documents/vault/bank_pay_in_slip/AS/2026/06/file.jpg",
      storageUrl: null,
    })
  })

  it("creates DocumentArchive and multiple DocumentArchiveLink rows", async () => {
    const { db, archiveCreate, linkCreate } = createMockDb()

    const result = await uploadDocumentArchive(db as never, {
      archiveKind: "BANK_PAY_IN_SLIP",
      legalEntityCode: "AS",
      archivedByStaffId: "staff-1",
      fileBuffer: Buffer.from("jpeg-bytes"),
      fileName: "slip.jpg",
      mimeType: "image/jpeg",
      links: [
        {
          documentKind: "COL",
          documentId: "col-1",
          documentNo: "COL-001",
          linkType: "EVIDENCE",
        },
        {
          documentKind: "COL",
          documentId: "col-2",
          documentNo: "COL-002",
          linkType: "EVIDENCE",
        },
      ],
    })

    expect(result.archiveId).toBe("archive-1")
    expect(result.linkIds).toHaveLength(2)
    expect(archiveCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ACTIVE",
          mimeType: "image/jpeg",
          storagePath: expect.stringContaining("documents/vault/"),
        }),
      })
    )
    expect(linkCreate).toHaveBeenCalledTimes(2)
  })

  it("uploaded archive is visible through resolver when vault hit is provided", () => {
    const vaultHit: VaultArchiveRecord = {
      archiveId: "archive-1",
      archiveKind: "BANK_PAY_IN_SLIP",
      status: "ACTIVE",
      storagePath: "documents/vault/bank_pay_in_slip/AS/2026/06/file.jpg",
      storageUrl: null,
      pdfPath: "documents/vault/bank_pay_in_slip/AS/2026/06/file.jpg",
      pdfBlobUrl: null,
      mimeType: "image/jpeg",
    }

    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    expect(
      resolveDocumentArchiveStatus(
        {
          documentKind: "COL",
          documentId: "col-1",
          archiveKind: "BANK_PAY_IN_SLIP",
          requiredPolicy: "required",
        },
        vaultHit
      ).archiveAvailable
    ).toBe(true)
  })

  it("COL multi-link archive makes multiple COL refs archiveAvailable true", () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    const vaultHit: VaultArchiveRecord = {
      archiveId: "shared",
      archiveKind: "BANK_PAY_IN_SLIP",
      status: "ACTIVE",
      storagePath: "documents/vault/bank_pay_in_slip/AS/2026/06/shared.jpg",
      storageUrl: null,
      pdfPath: "documents/vault/bank_pay_in_slip/AS/2026/06/shared.jpg",
      pdfBlobUrl: null,
      mimeType: "image/jpeg",
    }

    for (const documentId of ["col-a", "col-b"]) {
      expect(
        resolveDocumentArchiveStatus(
          {
            documentKind: "COL",
            documentId,
            archiveKind: "BANK_PAY_IN_SLIP",
            requiredPolicy: "required",
          },
          vaultHit
        ).archiveAvailable
      ).toBe(true)
    }
  })
})

describe("parseDocumentArchiveLinks", () => {
  it("parses JSON link array from upload body", () => {
    expect(
      parseDocumentArchiveLinks(
        JSON.stringify([
          { documentKind: "MJV", documentId: "mjv-1", documentNo: "MJV-001" },
        ])
      )
    ).toEqual([
      { documentKind: "MJV", documentId: "mjv-1", documentNo: "MJV-001", linkType: undefined },
    ])
  })
})
