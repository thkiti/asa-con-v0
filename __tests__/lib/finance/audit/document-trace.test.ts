import { Prisma } from "@/generated/prisma/client"
import {
  detectDocumentTraceQueryKind,
  traceFinanceDocument,
  type DocumentTracePrisma,
} from "@/lib/finance/audit/document-trace"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

const legalEntityCode = "AS"

const receiptRow = {
  id: "receipt-1",
  receiptNo: "REC-SH001-202601-000123",
  issuedAt: new Date("2026-01-15T10:00:00.000Z"),
  sale: {
    id: "sale-1",
    status: "COMPLETED",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    branchId: "branch-1",
  },
}

const voucherWithJournal = {
  id: "voucher-1",
  voucherNo: "V-2026-01-00001",
  status: "POSTED",
  date: new Date("2026-01-15T00:00:00.000Z"),
  description: "POS sale",
  refType: FINANCE_REF_TYPES.POS_SALE,
  refId: "sale-1",
  refNo: "REC-SH001-202601-000123",
  branchId: "branch-1",
  journalEntry: {
    id: "journal-1",
    postedAt: new Date("2026-01-15T12:00:00.000Z"),
    lines: [
      { debit: new Prisma.Decimal("1070"), credit: new Prisma.Decimal("0") },
      { debit: new Prisma.Decimal("0"), credit: new Prisma.Decimal("1000") },
      { debit: new Prisma.Decimal("0"), credit: new Prisma.Decimal("70") },
      { debit: new Prisma.Decimal("500"), credit: new Prisma.Decimal("0") },
      { debit: new Prisma.Decimal("0"), credit: new Prisma.Decimal("500") },
    ],
  },
}

function createPrismaMock(overrides: Partial<DocumentTracePrisma> = {}): DocumentTracePrisma {
  return {
    receipt: {
      findFirst: jest.fn(),
    },
    voucher: {
      findFirst: jest.fn(),
    },
    stockDocument: {
      findFirst: jest.fn(),
    },
    ...overrides,
  } as unknown as DocumentTracePrisma
}

describe("detectDocumentTraceQueryKind", () => {
  it("detects receipt, voucher, and stock prefixes", () => {
    expect(detectDocumentTraceQueryKind("REC-SH001-202601-000123")).toBe("receipt")
    expect(detectDocumentTraceQueryKind("V-2026-01-00001")).toBe("voucher")
    expect(detectDocumentTraceQueryKind("MJV-260001")).toBe("voucher")
    expect(detectDocumentTraceQueryKind("CNT-SH001-202606-0001")).toBe("stock")
    expect(detectDocumentTraceQueryKind("UNKNOWN-123")).toBe("unknown")
  })
})

describe("traceFinanceDocument", () => {
  it("traces REC downstream through sale, voucher, journal, and GL summary", async () => {
    const receiptFindFirst = jest.fn().mockResolvedValue(receiptRow)
    const voucherFindFirst = jest.fn().mockResolvedValue(voucherWithJournal)
    const prisma = createPrismaMock({
      receipt: { findFirst: receiptFindFirst },
      voucher: { findFirst: voucherFindFirst },
    })

    const result = await traceFinanceDocument(prisma, {
      query: "REC-SH001-202601-000123",
      legalEntityCode,
    })

    expect(receiptFindFirst).toHaveBeenCalled()
    expect(voucherFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          legalEntityCode,
          refType: FINANCE_REF_TYPES.POS_SALE,
          OR: [{ refId: "sale-1" }, { refNo: "REC-SH001-202601-000123" }],
        }),
      })
    )

    expect(result.root).toBe("Receipt:receipt-1")
    expect(result.nodes.map((node) => node.type)).toEqual([
      "Receipt",
      "Sale",
      "Voucher",
      "JournalEntry",
      "GeneralLedger",
    ]);
    expect(result.edges.map((edge) => edge.label)).toEqual([
      "CHECKOUT",
      "POST_SALE",
      "POSTED_TO_GL",
      "LEDGER_LINES",
    ])
    expect(result.warnings).toHaveLength(0)
    expect(result.nodes.find((node) => node.type === "GeneralLedger")).toMatchObject({
      description: "5 lines / Dr=1570.00 Cr=1570.00",
      status: "BALANCED",
    });
  })

  it("returns receipt and sale with warning when voucher is missing", async () => {
    const prisma = createPrismaMock({
      receipt: {
        findFirst: jest.fn().mockResolvedValue(receiptRow),
      },
      voucher: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    })

    const result = await traceFinanceDocument(prisma, {
      query: "REC-SH001-202601-000123",
      legalEntityCode,
    })

    expect(result.nodes.map((node) => node.type)).toEqual(["Receipt", "Sale"])
    expect(result.warnings).toContain(
      "No posted voucher found for receipt REC-SH001-202601-000123."
    )
  })

  it("traces voucher upstream to receipt when POS_SALE refNo is present", async () => {
    const voucherFindFirst = jest.fn().mockResolvedValue(voucherWithJournal)
    const receiptFindFirst = jest.fn().mockResolvedValue(receiptRow)
    const prisma = createPrismaMock({
      voucher: { findFirst: voucherFindFirst },
      receipt: { findFirst: receiptFindFirst },
    })

    const result = await traceFinanceDocument(prisma, {
      query: "V-2026-01-00001",
      legalEntityCode,
    })

    expect(voucherFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          legalEntityCode,
          OR: [{ voucherNo: "V-2026-01-00001" }, { refNo: "V-2026-01-00001" }],
        }),
      })
    )
    expect(receiptFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { saleId: "sale-1" },
      })
    )
    expect(result.root).toBe("Receipt:receipt-1")
    expect(result.nodes[0]?.type).toBe("Receipt")
    expect(result.edges.some((edge) => edge.label === "POST_SALE")).toBe(true)
  })

  it("uses refId fallback when voucher refNo is null", async () => {
    const voucherWithoutRefNo = {
      ...voucherWithJournal,
      refNo: null,
    }
    const voucherFindFirst = jest.fn().mockResolvedValue(voucherWithoutRefNo)
    const receiptFindFirst = jest.fn().mockResolvedValue(receiptRow)
    const prisma = createPrismaMock({
      voucher: { findFirst: voucherFindFirst },
      receipt: { findFirst: receiptFindFirst },
    })

    const result = await traceFinanceDocument(prisma, {
      query: "V-2026-01-00001",
      legalEntityCode,
    })

    expect(receiptFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { saleId: "sale-1" },
      })
    )
    expect(result.nodes.some((node) => node.type === "Receipt")).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it("returns warning for unknown document without crashing", async () => {
    const prisma = createPrismaMock()

    const result = await traceFinanceDocument(prisma, {
      query: "NOT-A-REAL-DOC",
      legalEntityCode,
    })

    expect(result.root).toBeNull()
    expect(result.nodes).toHaveLength(0)
    expect(result.warnings[0]).toContain("Could not detect document type")
    expect(prisma.receipt.findFirst).not.toHaveBeenCalled()
    expect(prisma.voucher.findFirst).not.toHaveBeenCalled()
    expect(prisma.stockDocument.findFirst).not.toHaveBeenCalled()
  })

  it("performs read-only prisma lookups only", async () => {
    const receiptFindFirst = jest.fn().mockResolvedValue(receiptRow)
    const voucherFindFirst = jest.fn().mockResolvedValue(voucherWithJournal)
    const prisma = createPrismaMock({
      receipt: {
        findFirst: receiptFindFirst,
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      voucher: {
        findFirst: voucherFindFirst,
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      stockDocument: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    })

    await traceFinanceDocument(prisma, {
      query: "REC-SH001-202601-000123",
      legalEntityCode,
    })

    expect(receiptFindFirst).toHaveBeenCalledTimes(1)
    expect(voucherFindFirst).toHaveBeenCalledTimes(1)
    expect(prisma.receipt.create).not.toHaveBeenCalled()
    expect(prisma.receipt.update).not.toHaveBeenCalled()
    expect(prisma.receipt.delete).not.toHaveBeenCalled()
    expect(prisma.voucher.create).not.toHaveBeenCalled()
    expect(prisma.voucher.update).not.toHaveBeenCalled()
    expect(prisma.voucher.delete).not.toHaveBeenCalled()
    expect(prisma.stockDocument.create).not.toHaveBeenCalled()
    expect(prisma.stockDocument.update).not.toHaveBeenCalled()
    expect(prisma.stockDocument.delete).not.toHaveBeenCalled()
  })
})
