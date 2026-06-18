jest.mock("@vercel/blob", () => ({
  put: jest.fn(),
}))

jest.mock("@/lib/catalog-image/vercel-blob", () => ({
  getBlobAuthConfig: jest.fn(() => ({ mode: "token", token: "test-token" })),
}))

import { put } from "@vercel/blob"
import {
  readStoredManualJournalPdf,
  storeManualJournalPdf,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-storage"
import { ManualJournalEntryErrorCodes } from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"

const mockPut = put as jest.Mock

describe("manual-journal-entry-pdf-storage (blob)", () => {
  const entryId = "11111111-1111-1111-1111-111111111111"
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.FINANCE_DOCUMENT_PDF_STORAGE = "blob"
    mockPut.mockResolvedValue({
      pathname: `manual-journal/${entryId}.pdf`,
      url: "https://blob.example/manual-journal/entry.pdf",
    })
  })

  afterEach(() => {
    delete process.env.FINANCE_DOCUMENT_PDF_STORAGE
    global.fetch = originalFetch
  })

  it("uploads PDF to Blob and returns pathname + url", async () => {
    const buffer = Buffer.from("%PDF-1.4 blob")

    const stored = await storeManualJournalPdf(entryId, buffer, "blob")

    expect(mockPut).toHaveBeenCalledWith(
      `manual-journal/${entryId}.pdf`,
      buffer,
      expect.objectContaining({ allowOverwrite: true })
    )
    expect(stored.pdfPath).toBe(`manual-journal/${entryId}.pdf`)
    expect(stored.pdfBlobUrl).toBe("https://blob.example/manual-journal/entry.pdf")
  })

  it("allows retry upload when blob pathname already exists", async () => {
    mockPut.mockResolvedValue({
      pathname: `manual-journal/${entryId}.pdf`,
      url: "https://blob.example/manual-journal/entry.pdf",
    })

    const buffer = Buffer.from("%PDF-1.4 blob")
    await storeManualJournalPdf(entryId, buffer, "blob")
    await storeManualJournalPdf(entryId, buffer, "blob")

    expect(mockPut).toHaveBeenCalledTimes(2)
    expect(mockPut.mock.calls[1]?.[2]).toEqual(
      expect.objectContaining({ allowOverwrite: true })
    )
  })

  it("reads PDF from stored Blob URL without re-rendering", async () => {
    const buffer = Buffer.from("%PDF-1.4 blob")
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    }) as unknown as typeof fetch

    const readBack = await readStoredManualJournalPdf(
      {
        pdfPath: `manual-journal/${entryId}.pdf`,
        pdfBlobUrl: "https://blob.example/manual-journal/entry.pdf",
      },
      "blob"
    )

    expect(global.fetch).toHaveBeenCalledWith("https://blob.example/manual-journal/entry.pdf")
    expect(Buffer.from(readBack).toString()).toBe(buffer.toString())
  })

  it("returns PDF_MISSING when Blob URL fetch fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch

    await expect(
      readStoredManualJournalPdf(
        {
          pdfPath: `manual-journal/${entryId}.pdf`,
          pdfBlobUrl: "https://blob.example/missing.pdf",
        },
        "blob"
      )
    ).rejects.toMatchObject({ code: ManualJournalEntryErrorCodes.PDF_MISSING })
  })

  it("returns PDF_METADATA_INCOMPLETE on blob backend when pdfBlobUrl is absent and store id missing", async () => {
    delete process.env.BLOB_STORE_ID
    await expect(
      readStoredManualJournalPdf(
        {
          pdfPath: `manual-journal/${entryId}.pdf`,
          pdfBlobUrl: null,
        },
        "blob"
      )
    ).rejects.toMatchObject({
      code: ManualJournalEntryErrorCodes.PDF_METADATA_INCOMPLETE,
    })
  })

  it("reads blob PDF using derived URL when pdfBlobUrl is absent", async () => {
    process.env.BLOB_STORE_ID = "store_qqMba5XFbpW5TXcp"
    const buffer = Buffer.from("%PDF-1.4 blob")
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () =>
        buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    }) as unknown as typeof fetch

    const readBack = await readStoredManualJournalPdf(
      {
        pdfPath: `manual-journal/${entryId}.pdf`,
        pdfBlobUrl: null,
      },
      "blob"
    )

    expect(global.fetch).toHaveBeenCalledWith(
      `https://qqmba5xfbpw5txcp.public.blob.vercel-storage.com/manual-journal/${entryId}.pdf`
    )
    expect(Buffer.from(readBack).toString()).toBe(buffer.toString())
  })
})
