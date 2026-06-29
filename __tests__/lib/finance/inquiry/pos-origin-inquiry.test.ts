import { Prisma } from "@/generated/prisma/client"
import { listFinanceVouchers } from "@/lib/finance/inquiry/voucher-list"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

const posSaleRow = {
  id: "voucher-rec-1",
  voucherNo: "V-2026-06-00010",
  date: new Date("2026-06-15"),
  legalEntityCode: "AS",
  refType: FINANCE_REF_TYPES.POS_SALE,
  refId: "sale-1",
  refNo: null,
  description: "POS sale",
  status: "POSTED",
  branchId: "branch-1",
  branch: { code: "SH001", name: "Shop 1" },
  period: { periodKey: "2026-06" },
  journalEntry: {
    id: "journal-rec-1",
    lines: [
      { debit: new Prisma.Decimal("1500"), credit: new Prisma.Decimal("0") },
      { debit: new Prisma.Decimal("0"), credit: new Prisma.Decimal("1500") },
    ],
  },
  lines: [],
  manualJournalEntryPosted: null,
  paymentVoucherPosted: null,
  revenueVoucherPosted: null,
  pettyCashVoucherPosted: null,
}

const posRefundRow = {
  ...posSaleRow,
  id: "voucher-ref-1",
  voucherNo: "V-2026-06-00011",
  refType: FINANCE_REF_TYPES.POS_REFUND,
  refId: "refund-1",
  refNo: "REF-SH001-202606-0002",
  description: "POS refund",
  journalEntry: {
    id: "journal-ref-1",
    lines: [
      { debit: new Prisma.Decimal("0"), credit: new Prisma.Decimal("500") },
      { debit: new Prisma.Decimal("500"), credit: new Prisma.Decimal("0") },
    ],
  },
}

describe("listFinanceVouchers POS-origin rows", () => {
  it("enriches REC document no and archive PDF from receipt", async () => {
    const findMany = jest.fn().mockResolvedValue([posSaleRow])
    const count = jest.fn().mockResolvedValue(1)
    const receiptFindMany = jest.fn().mockResolvedValue([
      {
        saleId: "sale-1",
        receiptNo: "REC-SH001-202606-0001",
        pdfPath: "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
      },
    ])
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique: jest.fn() },
      receipt: { findMany: receiptFindMany },
    }

    const result = await listFinanceVouchers(prisma, { legalEntityCode: "AS" })

    expect(receiptFindMany).toHaveBeenCalledWith({
      where: { saleId: { in: ["sale-1"] } },
      select: {
        saleId: true,
        receiptNo: true,
        pdfPath: true,
      },
    })
    expect(result.vouchers[0]).toMatchObject({
      documentTypeCode: "REC",
      documentNo: "REC-SH001-202606-0001",
      journalEntryId: "journal-rec-1",
      amount: "1500",
      pdfAvailable: true,
    })
  })

  it("maps REF rows from posted voucher refNo", async () => {
    const findMany = jest.fn().mockResolvedValue([posRefundRow])
    const count = jest.fn().mockResolvedValue(1)
    const prisma = {
      voucher: { findMany, count },
      accountingPeriod: { findUnique: jest.fn() },
      receipt: { findMany: jest.fn().mockResolvedValue([]) },
    }

    const result = await listFinanceVouchers(prisma, { legalEntityCode: "AS" })

    expect(result.vouchers[0]).toMatchObject({
      documentTypeCode: "REF",
      documentNo: "REF-SH001-202606-0002",
      journalEntryId: "journal-ref-1",
      amount: "500",
      pdfAvailable: null,
    })
  })
})
