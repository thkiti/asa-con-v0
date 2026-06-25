jest.mock("@/lib/pos/receipt-pdf-render", () => ({
  renderReceiptPdfFromSnapshot: jest.fn(),
}))

jest.mock("@/lib/document-archive/storage/storage", () => ({
  storeDocumentArchivePdf: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    receipt: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    documentArchive: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  },
}))

import { attachReceiptPdfArchive } from "@/lib/document-archive/attach-receipt-pdf"
import { storeDocumentArchivePdf } from "@/lib/document-archive/storage/storage"
import { renderReceiptPdfFromSnapshot } from "@/lib/pos/receipt-pdf-render"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import { prisma } from "@/lib/shared/prisma"

const mockFindUnique = prisma.receipt.findUnique as jest.Mock
const mockReceiptUpdate = prisma.receipt.update as jest.Mock
const mockArchiveUpsert = prisma.documentArchive.upsert as jest.Mock
const mockArchiveUpdate = prisma.documentArchive.update as jest.Mock
const mockRender = renderReceiptPdfFromSnapshot as jest.Mock
const mockStore = storeDocumentArchivePdf as jest.Mock

const snapshot = {
  snapshotVersion: 1 as const,
  receiptId: "receipt-1",
  saleId: "sale-1",
  branchId: "branch-1",
  receiptNo: "REC-SH001-202606-0001",
  issuedAt: "2026-06-15T10:00:00.000Z",
  branchCode: "SH001",
  branchName: "Shop",
  branchAddress: null,
  branchPhone: null,
  companyDisplayName: "ASA SERVICES",
  companyTaxId: "TAX-1",
  machineTaxId: null,
  cashierDisplay: "103-Somsak",
  lines: [
    {
      code: "0101001",
      name: "Widget",
      qty: 1,
      unitPrice: "100.00",
      lineTotal: "100.00",
    },
  ],
  total: "100.00",
  paymentMethod: "CASH",
  cashAmount: "100.00",
  change: "0.00",
  thermalLayout: DEFAULT_THERMAL_LAYOUTS.RECEIPT,
}

describe("attachReceiptPdfArchive", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRender.mockResolvedValue(Buffer.from("%PDF-1.4"))
    mockStore.mockResolvedValue({
      pdfPath: "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
      pdfBlobUrl: null,
    })
    mockArchiveUpsert.mockResolvedValue({ id: "archive-1" })
    mockArchiveUpdate.mockResolvedValue({ id: "archive-1" })
    mockReceiptUpdate.mockResolvedValue({
      id: "receipt-1",
      pdfPath: "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
    })
  })

  it("creates READY archive and updates Receipt pdf fields on success", async () => {
    mockFindUnique.mockResolvedValue({
      id: "receipt-1",
      receiptNo: snapshot.receiptNo,
      branchId: "branch-1",
      issuedAt: new Date(snapshot.issuedAt),
      pdfPath: null,
      pdfGeneratedAt: null,
      documentArchiveId: null,
      documentArchive: null,
    })

    const result = await attachReceiptPdfArchive({
      receiptId: "receipt-1",
      branchId: "branch-1",
      snapshot,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pdfPath).toBe("documents/receipt/2026/06/REC-SH001-202606-0001.pdf")
    expect(result.documentArchiveId).toBe("archive-1")
    expect(mockRender).toHaveBeenCalledWith(snapshot)
    expect(mockStore).toHaveBeenCalled()
    expect(mockArchiveUpsert).toHaveBeenCalled()
    expect(mockArchiveUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "archive-1" },
        data: expect.objectContaining({ status: "READY" }),
      })
    )
    expect(mockReceiptUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "receipt-1", pdfPath: null },
        data: expect.objectContaining({
          documentArchiveId: "archive-1",
          pdfPath: "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
        }),
      })
    )
  })

  it("does not regenerate when Receipt pdfPath already exists", async () => {
    const generatedAt = new Date("2026-06-15T10:01:00.000Z")
    mockFindUnique.mockResolvedValue({
      id: "receipt-1",
      receiptNo: snapshot.receiptNo,
      branchId: "branch-1",
      issuedAt: new Date(snapshot.issuedAt),
      pdfPath: "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
      pdfGeneratedAt: generatedAt,
      documentArchiveId: "archive-1",
      documentArchive: {
        id: "archive-1",
        status: "READY",
        pdfPath: "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
        generatedAt,
      },
    })

    const result = await attachReceiptPdfArchive({
      receiptId: "receipt-1",
      branchId: "branch-1",
      snapshot,
    })

    expect(result.ok).toBe(true)
    expect(mockRender).not.toHaveBeenCalled()
    expect(mockStore).not.toHaveBeenCalled()
    expect(mockArchiveUpsert).not.toHaveBeenCalled()
  })

  it("marks archive FAILED without updating Receipt pdf fields when render fails", async () => {
    mockFindUnique.mockResolvedValue({
      id: "receipt-1",
      receiptNo: snapshot.receiptNo,
      branchId: "branch-1",
      issuedAt: new Date(snapshot.issuedAt),
      pdfPath: null,
      pdfGeneratedAt: null,
      documentArchiveId: null,
      documentArchive: null,
    })
    mockRender.mockRejectedValue(new Error("render failed"))

    const result = await attachReceiptPdfArchive({
      receiptId: "receipt-1",
      branchId: "branch-1",
      snapshot,
    })

    expect(result).toEqual({ ok: false, error: "render failed" })
    expect(mockArchiveUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "archive-1" },
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "render failed",
        }),
      })
    )
    expect(
      mockReceiptUpdate.mock.calls.some(
        ([args]) =>
          args?.data?.pdfPath === "documents/receipt/2026/06/REC-SH001-202606-0001.pdf"
      )
    ).toBe(false)
  })
})
