import type { CollectorPickupSettlementReconciliation } from "@/lib/finance-ui/collector-pickup-settlement"
import {
  buildDepositJournalDisplay,
  buildPickupJournalDisplay,
  formatPayInEvidenceStatusLabel,
  formatSettlementAccountLabel,
  formatSettlementJournalLine,
} from "@/lib/finance-ui/collector-pickup-settlement-detail"

const baseRow: CollectorPickupSettlementReconciliation = {
  collectorReportId: "collector-report-1",
  collectNo: "COL-SH001-202606-0001",
  mode: "COLLECT",
  branchId: "branch-1",
  branchCode: "SH001",
  branchName: "Chidlom",
  expectedAmount: "1000.00",
  voucherId: null,
  voucherNo: null,
  glDebitCashInTransit1031: "0.00",
  glCreditCashDrawer1001: "0.00",
  postedAmountEquivalent: "0.00",
  variance: "1000.00",
  status: "NOT_POSTED",
  depositStatus: "NOT_ELIGIBLE",
  inTransitAmount: "1000.00",
  bankDepositVoucherId: null,
  bankDepositVoucherNo: null,
  glDebitBank1021: "0.00",
  glCreditCashInTransit1031: "0.00",
  payInEvidenceId: null,
  payInEvidenceStatus: null,
  payInEvidenceUrl: null,
  payInSlipMissingWarning: false,
  bankDepositDate: null,
  bankAccountCode: null,
}

describe("collector pickup settlement detail helpers", () => {
  it("builds pickup journal lines for posted pickup", () => {
    const journal = buildPickupJournalDisplay({
      ...baseRow,
      status: "POSTED",
      voucherId: "voucher-pickup-1",
      voucherNo: "V-2026-06-00001",
      glDebitCashInTransit1031: "1000.00",
      glCreditCashDrawer1001: "1000.00",
    })

    expect(journal.posted).toBe(true)
    expect(journal.debitAccount).toBe("1031")
    expect(journal.creditAccount).toBe("1001")
    expect(journal.debitAmount).toBe("1000.00")
    expect(journal.creditAmount).toBe("1000.00")
  })

  it("marks pickup journal as not posted when no voucher", () => {
    expect(buildPickupJournalDisplay(baseRow).posted).toBe(false)
  })

  it("builds deposit journal lines for posted deposit", () => {
    const journal = buildDepositJournalDisplay({
      ...baseRow,
      status: "POSTED",
      depositStatus: "POSTED",
      bankDepositVoucherId: "voucher-deposit-1",
      bankDepositVoucherNo: "V-2026-06-00002",
      glDebitBank1021: "1000.00",
      glCreditCashInTransit1031: "1000.00",
      bankAccountCode: "1021",
    })

    expect(journal.posted).toBe(true)
    expect(journal.debitAccount).toBe("1021")
    expect(journal.creditAccount).toBe("1031")
    expect(journal.debitAmount).toBe("1000.00")
    expect(journal.creditAmount).toBe("1000.00")
  })

  it("defaults deposit debit account to 1021 when bank code missing", () => {
    const journal = buildDepositJournalDisplay({
      ...baseRow,
      depositStatus: "POSTED",
      bankDepositVoucherId: "voucher-deposit-1",
      glDebitBank1021: "500.00",
      glCreditCashInTransit1031: "500.00",
    })

    expect(journal.debitAccount).toBe("1021")
  })

  it("handles missing journal and evidence without crashing", () => {
    expect(buildDepositJournalDisplay(baseRow).posted).toBe(false)
    expect(formatPayInEvidenceStatusLabel(baseRow)).toBe("Not uploaded")
    expect(
      formatPayInEvidenceStatusLabel({
        ...baseRow,
        payInEvidenceStatus: "UPLOADED",
        payInEvidenceUrl: "https://example.test/pay-in.jpg",
      })
    ).toBe("Uploaded")
  })

  it("formats settlement account labels for journal display", () => {
    expect(formatSettlementAccountLabel("1031")).toBe("1031 Cash in Transit")
    expect(formatSettlementAccountLabel("1001")).toBe("1001 Cash in Drawer")
    expect(formatSettlementAccountLabel("1021")).toBe("1021 Bank")
    expect(formatSettlementJournalLine("Dr", "1031", "1000.00")).toBe(
      "Dr 1031 Cash in Transit    1000.00"
    )
  })
})
