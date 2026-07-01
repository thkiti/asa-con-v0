import {
  buildFinanceVoucherPrintModelFromManualJournalEntry,
  buildFinanceVoucherPrintModelFromPaymentVoucher,
  buildFinanceVoucherPrintModelFromInvoiceVoucher,
  buildFinanceVoucherPrintModelFromRevenueVoucher,
  buildFinanceVoucherPrintModelFromPettyCashVoucher,
} from "@/lib/finance-ui/finance-voucher-print"
import type { ManualJournalEntryRead } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read-types"
import type { PaymentVoucherRead } from "@/lib/finance/payment-voucher/payment-voucher-read-types"
import type { InvoiceVoucherRead } from "@/lib/finance/invoice-voucher/invoice-voucher-read-types"
import type { RevenueVoucherRead } from "@/lib/finance/revenue-voucher/revenue-voucher-read-types"
import type { PettyCashVoucherRead } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-read-types"

function baseEntry(overrides: Partial<ManualJournalEntryRead> = {}): ManualJournalEntryRead {
  return {
    id: "entry-1",
    entryNo: "MJV-260001",
    entryType: "MANUAL",
    status: "POSTED",
    branchId: "branch-1",
    branchCode: "HO999",
    branchName: "Head Office",
    legalEntityCode: "AS",
    entryDate: "2026-06-14T12:00:00.000Z",
    description: "Month-end accrual",
    refNo: "REF-100",
    createdByStaffId: "staff-prep",
    submittedAt: "2026-06-14T13:00:00.000Z",
    submittedByStaffId: "staff-appr",
    confirmedAt: "2026-06-14T14:00:00.000Z",
    confirmedByStaffId: "staff-check",
    postedAt: "2026-06-14T15:00:00.000Z",
    postedByStaffId: "staff-post",
    cancelledAt: null,
    cancelledByStaffId: null,
    cancelReason: null,
    postedVoucherId: "voucher-1",
    postedJournalEntryId: "journal-1",
    reversalJournalEntryId: null,
    pdfPath: null,
    pdfBlobUrl: null,
    pdfGeneratedAt: null,
    pdfSnapshotReady: false,
    createdAt: "2026-06-14T11:00:00.000Z",
    updatedAt: "2026-06-14T15:00:00.000Z",
    lines: [
      {
        id: "line-1",
        lineNo: 1,
        glAccountId: "acc-1",
        accountCode: "1100",
        accountName: "Cash",
        debit: "100.00",
        credit: "0.00",
        memo: "Line memo",
      },
      {
        id: "line-2",
        lineNo: 2,
        glAccountId: "acc-2",
        accountCode: "4100",
        accountName: "Revenue",
        debit: "0.00",
        credit: "100.00",
        memo: null,
      },
    ],
    ...overrides,
  }
}

describe("finance-voucher-print", () => {
  it("maps saved manual journal entry to print model without recalculation path", () => {
    const model = buildFinanceVoucherPrintModelFromManualJournalEntry(baseEntry())

    expect(model.documentTypeCode).toBe("MJV")
    expect(model.documentNo).toBe("MJV-260001")
    expect(model.branchLabel).toBe("HO999 • Head Office")
    expect(model.reference).toBe("REF-100")
    expect(model.description).toBe("Month-end accrual")
    expect(model.totalDebit).toBe("100")
    expect(model.totalCredit).toBe("100")
    expect(model.preparedBy).toBe("staff-prep")
    expect(model.checkedBy).toBe("staff-check")
    expect(model.approvedBy).toBe("staff-appr")
    expect(model.postedBy).toBe("staff-post")
    expect(model.lines).toHaveLength(2)
    expect(model.lines[0].lineDescription).toBe("Line memo")
  })

  it("derives OPB document type code from entry number prefix", () => {
    const model = buildFinanceVoucherPrintModelFromManualJournalEntry(
      baseEntry({ entryNo: "OPB-260002", entryType: "OPENING_BALANCE" })
    )
    expect(model.documentTypeCode).toBe("OPB")
    expect(model.documentTypeTitle).toBe("OPENING BALANCE")
  })

  it("never uses branchId UUID as branch label", () => {
    const model = buildFinanceVoucherPrintModelFromManualJournalEntry(
      baseEntry({
        branchCode: null,
        branchName: null,
        branchId: "4778631f-a86c-45c4-82cf-09520087ee1a",
      })
    )

    expect(model.branchLabel).toBe("—")
    expect(model.branchLabel).not.toContain("4778631f")
  })
})

function basePaymentVoucher(
  overrides: Partial<PaymentVoucherRead> = {}
): PaymentVoucherRead {
  return {
    id: "pav-1",
    entryNo: "PAV-260001",
    status: "POSTED",
    branchId: "branch-1",
    legalEntityCode: "AS",
    entryDate: "2026-06-21T12:00:00.000Z",
    payFromAccountId: "acc-bank",
    payFromAccountCode: "10101001",
    payFromAccountName: "Kasikorn Current",
    payeeName: "ABC Stationery Co., Ltd.",
    refNo: "INV-2026-0042",
    chequeNo: "1234567",
    description: "Office supplies — June",
    totalAmount: "2000.00",
    createdByStaffId: "staff-prep",
    submittedAt: "2026-06-21T13:00:00.000Z",
    submittedByStaffId: "staff-appr",
    confirmedAt: "2026-06-21T14:00:00.000Z",
    confirmedByStaffId: "staff-check",
    postedAt: "2026-06-21T15:00:00.000Z",
    postedByStaffId: "staff-post",
    cancelledAt: null,
    cancelledByStaffId: null,
    cancelReason: null,
    postedVoucherId: "voucher-pav-1",
    postedJournalEntryId: "journal-pav-1",
    createdAt: "2026-06-21T11:00:00.000Z",
    updatedAt: "2026-06-21T15:00:00.000Z",
    lines: [
      {
        id: "line-1",
        lineNo: 1,
        glAccountId: "acc-exp",
        accountCode: "50101001",
        accountName: "Office supplies",
        debit: "2000.00",
        credit: "0.00",
        memo: "June stock-up",
      },
    ],
    ...overrides,
  }
}

describe("buildFinanceVoucherPrintModelFromPaymentVoucher", () => {
  it("maps stored payment voucher lines without derived credit row", () => {
    const model = buildFinanceVoucherPrintModelFromPaymentVoucher(
      basePaymentVoucher({
        lines: [
          {
            id: "line-1",
            lineNo: 1,
            glAccountId: "acc-exp",
            accountCode: "50101001",
            accountName: "Office supplies",
            debit: "2000.00",
            credit: "0.00",
            memo: "June stock-up",
          },
          {
            id: "line-2",
            lineNo: 2,
            glAccountId: "acc-bank",
            accountCode: "10101001",
            accountName: "Kasikorn Current",
            debit: "0.00",
            credit: "2000.00",
            memo: "Payment to ABC Stationery Co., Ltd.",
          },
        ],
      }),
      {
      branchLabel: "HO999 — Head Office",
    })

    expect(model.documentTypeCode).toBe("PAV")
    expect(model.documentTypeTitle).toBe("PAYMENT VOUCHER")
    expect(model.documentNo).toBe("PAV-260001")
    expect(model.totalDebit).toBe("2000")
    expect(model.totalCredit).toBe("2000")
    expect(model.payeeName).toBe("ABC Stationery Co., Ltd.")
    expect(model.payFromLabel).toBe("10101001 — Kasikorn Current")
    expect(model.chequeNo).toBe("1234567")
    expect(model.lines).toHaveLength(2)
    expect(model.lines[1].accountCode).toBe("10101001")
    expect(model.lines[1].credit).toBe("2000.00")
  })
})

function baseInvoiceVoucher(
  overrides: Partial<InvoiceVoucherRead> = {}
): InvoiceVoucherRead {
  return {
    id: "inv-1",
    entryNo: "INV-260001",
    status: "POSTED",
    branchId: "branch-1",
    legalEntityCode: "AD",
    invoiceDate: "2026-06-21T12:00:00.000Z",
    dueDate: "2026-07-21T12:00:00.000Z",
    customerName: "Customer Co.",
    refNo: "PO-100",
    description: "June invoice",
    createdByStaffId: "staff-prep",
    submittedAt: null,
    submittedByStaffId: null,
    confirmedAt: null,
    confirmedByStaffId: null,
    postedAt: "2026-06-21T15:00:00.000Z",
    postedByStaffId: "staff-post",
    cancelledAt: null,
    cancelledByStaffId: null,
    cancelReason: null,
    postedVoucherId: "voucher-inv-1",
    postedJournalEntryId: "journal-inv-1",
    createdAt: "2026-06-21T11:00:00.000Z",
    updatedAt: "2026-06-21T15:00:00.000Z",
    lines: [
      {
        id: "line-1",
        lineNo: 1,
        glAccountId: "acc-1",
        accountCode: "1100",
        accountName: "AR",
        debit: "500.00",
        credit: "0.00",
        memo: null,
      },
      {
        id: "line-2",
        lineNo: 2,
        glAccountId: "acc-2",
        accountCode: "4100",
        accountName: "Revenue",
        debit: "0.00",
        credit: "500.00",
        memo: null,
      },
    ],
    ...overrides,
  }
}

function baseRevenueVoucher(
  overrides: Partial<RevenueVoucherRead> = {}
): RevenueVoucherRead {
  return {
    id: "rev-1",
    entryNo: "REV-260001",
    status: "POSTED",
    branchId: "branch-1",
    legalEntityCode: "AD",
    entryDate: "2026-06-21T12:00:00.000Z",
    receiveToAccountId: "acc-bank",
    receiveToAccountCode: "10101001",
    receiveToAccountName: "Kasikorn Current",
    receivedFromName: "Walk-in customer",
    refNo: "REF-1",
    receiptNo: "RCPT-99",
    description: "Cash sale",
    createdByStaffId: "staff-prep",
    submittedAt: null,
    submittedByStaffId: null,
    confirmedAt: null,
    confirmedByStaffId: null,
    postedAt: "2026-06-21T15:00:00.000Z",
    postedByStaffId: "staff-post",
    cancelledAt: null,
    cancelledByStaffId: null,
    cancelReason: null,
    postedVoucherId: "voucher-rev-1",
    postedJournalEntryId: "journal-rev-1",
    createdAt: "2026-06-21T11:00:00.000Z",
    updatedAt: "2026-06-21T15:00:00.000Z",
    lines: [
      {
        id: "line-1",
        lineNo: 1,
        glAccountId: "acc-bank",
        accountCode: "10101001",
        accountName: "Kasikorn Current",
        debit: "300.00",
        credit: "0.00",
        memo: null,
      },
      {
        id: "line-2",
        lineNo: 2,
        glAccountId: "acc-rev",
        accountCode: "4100",
        accountName: "Revenue",
        debit: "0.00",
        credit: "300.00",
        memo: null,
      },
    ],
    ...overrides,
  }
}

function basePettyCashVoucher(
  overrides: Partial<PettyCashVoucherRead> = {}
): PettyCashVoucherRead {
  return {
    id: "pcv-1",
    entryNo: "PCV-260001",
    status: "POSTED",
    branchId: "branch-1",
    legalEntityCode: "AD",
    entryDate: "2026-06-21T12:00:00.000Z",
    pettyCashAccountId: "acc-petty",
    pettyCashAccountCode: "10102001",
    pettyCashAccountName: "Petty cash",
    payeeName: "Stationery shop",
    refNo: "REF-PCV",
    description: "Supplies",
    createdByStaffId: "staff-prep",
    submittedAt: null,
    submittedByStaffId: null,
    confirmedAt: null,
    confirmedByStaffId: null,
    postedAt: "2026-06-21T15:00:00.000Z",
    postedByStaffId: "staff-post",
    cancelledAt: null,
    cancelledByStaffId: null,
    cancelReason: null,
    postedVoucherId: "voucher-pcv-1",
    postedJournalEntryId: "journal-pcv-1",
    createdAt: "2026-06-21T11:00:00.000Z",
    updatedAt: "2026-06-21T15:00:00.000Z",
    lines: [
      {
        id: "line-1",
        lineNo: 1,
        glAccountId: "acc-exp",
        accountCode: "50101001",
        accountName: "Office supplies",
        debit: "150.00",
        credit: "0.00",
        memo: null,
      },
      {
        id: "line-2",
        lineNo: 2,
        glAccountId: "acc-petty",
        accountCode: "10102001",
        accountName: "Petty cash",
        debit: "0.00",
        credit: "150.00",
        memo: null,
      },
    ],
    ...overrides,
  }
}

describe("canonical voucher print models", () => {
  it("INV print model legalEntityLabel matches saved entry entity", () => {
    const model = buildFinanceVoucherPrintModelFromInvoiceVoucher(baseInvoiceVoucher())
    expect(model.documentTypeCode).toBe("INV")
    expect(model.legalEntityLabel).toBe("ASAD")
    expect(model.customerName).toBe("Customer Co.")
    expect(model.dueDate).toBeTruthy()
  })

  it("REV print model legalEntityLabel matches saved entry entity", () => {
    const model = buildFinanceVoucherPrintModelFromRevenueVoucher(baseRevenueVoucher())
    expect(model.documentTypeCode).toBe("REV")
    expect(model.legalEntityLabel).toBe("ASAD")
    expect(model.receivedFromName).toBe("Walk-in customer")
    expect(model.receiptNo).toBe("RCPT-99")
  })

  it("PCV print model legalEntityLabel matches saved entry entity", () => {
    const model = buildFinanceVoucherPrintModelFromPettyCashVoucher(basePettyCashVoucher())
    expect(model.documentTypeCode).toBe("PCV")
    expect(model.legalEntityLabel).toBe("ASAD")
    expect(model.payeeName).toBe("Stationery shop")
    expect(model.pettyCashAccountLabel).toContain("10102001")
  })

  it("MJV and PAV print models keep header entity aligned with entry entity", () => {
    const mjv = buildFinanceVoucherPrintModelFromManualJournalEntry(
      baseEntry({ legalEntityCode: "AD" })
    )
    const pav = buildFinanceVoucherPrintModelFromPaymentVoucher(
      basePaymentVoucher({ legalEntityCode: "AD" })
    )
    expect(mjv.legalEntityLabel).toBe("ASAD")
    expect(pav.legalEntityLabel).toBe("ASAD")
  })
})
