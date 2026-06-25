import { searchReceiptLookup } from "@/lib/pos/receipt-lookup"

function makeDb(receipts: unknown[], staff: unknown[] = []) {
  return {
    receipt: {
      findMany: jest.fn().mockResolvedValue(receipts),
    },
    staff: {
      findMany: jest.fn().mockResolvedValue(staff),
    },
  }
}

const readyReceipt = {
  id: "receipt-1",
  receiptNo: "REC-SH001-202606-0001",
  issuedAt: new Date("2026-06-06T10:00:00.000Z"),
  branchId: "branch-1",
  documentArchiveId: "arch-1",
  pdfPath: "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
  pdfBlobUrl: null,
  documentArchive: {
    status: "READY",
    pdfPath: "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
    pdfBlobUrl: null,
    errorMessage: null,
  },
  sale: {
    total: { toFixed: () => "250.00" },
    staffId: "103",
    branch: { code: "SH001", name: "Shop One" },
    payment: { method: "CASH" },
  },
}

const pendingReceipt = {
  ...readyReceipt,
  id: "receipt-2",
  receiptNo: "REC-SH001-202606-0002",
  documentArchiveId: "arch-2",
  pdfPath: null,
  documentArchive: {
    status: "PENDING",
    pdfPath: null,
    pdfBlobUrl: null,
    errorMessage: null,
  },
}

const failedReceipt = {
  ...readyReceipt,
  id: "receipt-3",
  receiptNo: "REC-SH001-202606-0003",
  documentArchiveId: "arch-3",
  pdfPath: null,
  documentArchive: {
    status: "FAILED",
    pdfPath: null,
    pdfBlobUrl: null,
    errorMessage: "PDF render failed",
  },
}

const legacyReceipt = {
  ...readyReceipt,
  id: "receipt-4",
  receiptNo: "REC-SH001-202605-0099",
  documentArchiveId: null,
  pdfPath: null,
  pdfBlobUrl: null,
  documentArchive: null,
}

describe("searchReceiptLookup", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("looks up receipts by receiptNo", async () => {
    const db = makeDb([readyReceipt], [{ staffId: "103", name: "Somsak" }])

    const result = await searchReceiptLookup(db, {
      branchId: "branch-1",
      receiptNo: "0001",
    })

    expect(db.receipt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: "branch-1",
          receiptNo: { contains: "0001", mode: "insensitive" },
        }),
      })
    )
    expect(result.receipts).toHaveLength(1)
    expect(result.receipts[0]).toMatchObject({
      receiptNo: "REC-SH001-202606-0001",
      archiveStatus: "ready",
      pdfUrl: "/api/pos/receipts/receipt-1/pdf?disposition=inline",
      staffDisplay: "103-Somsak",
    })
  })

  it("looks up receipts by date range", async () => {
    const db = makeDb([readyReceipt])

    await searchReceiptLookup(db, {
      branchId: "branch-1",
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
    })

    expect(db.receipt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          issuedAt: {
            gte: new Date("2026-06-01T00:00:00+07:00"),
            lte: new Date("2026-06-30T23:59:59.999+07:00"),
          },
        }),
      })
    )
  })

  it("enables PDF URL for READY archive rows", async () => {
    const db = makeDb([readyReceipt])

    const result = await searchReceiptLookup(db, { branchId: "branch-1" })

    expect(result.receipts[0].archiveStatus).toBe("ready")
    expect(result.receipts[0].pdfUrl).toContain("/api/pos/receipts/receipt-1/pdf")
  })

  it("disables PDF URL for PENDING archive rows", async () => {
    const db = makeDb([pendingReceipt])

    const result = await searchReceiptLookup(db, { branchId: "branch-1" })

    expect(result.receipts[0]).toMatchObject({
      archiveStatus: "pending",
      archiveStatusLabel: "Preparing...",
      pdfUrl: null,
    })
  })

  it("shows failed archive status", async () => {
    const db = makeDb([failedReceipt])

    const result = await searchReceiptLookup(db, { branchId: "branch-1" })

    expect(result.receipts[0]).toMatchObject({
      archiveStatus: "failed",
      archiveStatusLabel: "Archive failed",
      archiveError: "PDF render failed",
      pdfUrl: null,
    })
  })

  it("shows legacy status when archive is missing", async () => {
    const db = makeDb([legacyReceipt])

    const result = await searchReceiptLookup(db, { branchId: "branch-1" })

    expect(result.receipts[0]).toMatchObject({
      archiveStatus: "legacy",
      archiveStatusLabel: "Legacy / no archive",
      pdfUrl: null,
    })
  })
})
