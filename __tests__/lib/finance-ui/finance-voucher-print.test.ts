import {
  buildFinanceVoucherPrintModelFromManualJournalEntry,
  buildFinanceVoucherPrintModelFromPaymentVoucher,
} from "@/lib/finance-ui/finance-voucher-print"
import type { ManualJournalEntryRead } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read-types"
import type { PaymentVoucherRead } from "@/lib/finance/payment-voucher/payment-voucher-read-types"

function baseEntry(overrides: Partial<ManualJournalEntryRead> = {}): ManualJournalEntryRead {
  return {
    id: "entry-1",
    entryNo: "MJV-260001",
    entryType: "MANUAL",
    status: "POSTED",
    branchId: "branch-1",
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
    const model = buildFinanceVoucherPrintModelFromManualJournalEntry(baseEntry(), {
      branchLabel: "HO999 — Head Office",
    })

    expect(model.documentTypeCode).toBe("MJV")
    expect(model.documentNo).toBe("MJV-260001")
    expect(model.branchLabel).toBe("HO999 — Head Office")
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
  it("includes derived credit line and PAV context fields", () => {
    const model = buildFinanceVoucherPrintModelFromPaymentVoucher(basePaymentVoucher(), {
      branchLabel: "HO999 — Head Office",
    })

    expect(model.documentTypeCode).toBe("PAV")
    expect(model.documentTypeTitle).toBe("PAYMENT VOUCHER")
    expect(model.documentNo).toBe("PAV-260001")
    expect(model.totalDebit).toBe("2000.00")
    expect(model.totalCredit).toBe("2000.00")
    expect(model.payeeName).toBe("ABC Stationery Co., Ltd.")
    expect(model.payFromLabel).toBe("10101001 — Kasikorn Current")
    expect(model.chequeNo).toBe("1234567")
    expect(model.lines).toHaveLength(2)
    expect(model.lines[1].accountCode).toBe("10101001")
    expect(model.lines[1].credit).toBe("2000.00")
    expect(model.lines[1].lineDescription).toBe("Payment to ABC Stationery Co., Ltd.")
  })
})
