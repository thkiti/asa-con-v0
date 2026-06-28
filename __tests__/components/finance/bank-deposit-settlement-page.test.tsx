import { renderToStaticMarkup } from "react-dom/server"
import { BankDepositSettlementTable } from "@/components/finance/BankDepositSettlementTable"
import { bankDepositSettlementActionHint } from "@/lib/finance-ui/bank-deposit-settlement-display"
import type { BankDepositSettlementReconciliation } from "@/lib/finance-ui/bank-deposit-settlement"

const baseRow: BankDepositSettlementReconciliation = {
  collectorReportId: "collector-report-1",
  collectNo: "COL-SH001-202606-0001",
  mode: "COLLECT",
  branchId: "branch-1",
  branchCode: "SH001",
  branchName: "Chidlom",
  inTransitAmount: "1000.00",
  collectorPickupVoucherId: "pickup-voucher-1",
  collectorPickupVoucherNo: "V-PICK-001",
  voucherId: null,
  voucherNo: null,
  glDebitBank1021: "0.00",
  glCreditCashInTransit1031: "0.00",
  postedAmountEquivalent: "0.00",
  variance: "1000.00",
  status: "NOT_POSTED",
  payInEvidenceId: null,
  payInEvidenceStatus: null,
  payInEvidenceUrl: null,
  payInSlipMissingWarning: false,
  bankDepositDate: null,
  bankAccountCode: null,
}

describe("bank deposit settlement display helpers", () => {
  it("shows missing slip warning for legacy posted rows", () => {
    expect(
      bankDepositSettlementActionHint({
        status: "POSTED",
        payInSlipMissingWarning: true,
      })
    ).toBe("Missing slip")
  })
})

describe("BankDepositSettlementTable", () => {
  it("renders debug review table with slip preview only", () => {
    const html = renderToStaticMarkup(
      <BankDepositSettlementTable
        items={[baseRow]}
        onPreviewPayInSlip={() => undefined}
      />
    )

    expect(html).toContain("PAY-IN Slip")
    expect(html).not.toContain('data-testid="pay-in-open-')
  })

  it("shows uploaded slip indicator for preview", () => {
    const html = renderToStaticMarkup(
      <BankDepositSettlementTable
        items={[
          {
            ...baseRow,
            status: "POSTED",
            variance: "0.00",
            payInEvidenceStatus: "UPLOADED",
            payInEvidenceUrl: "https://example.test/pay-in.jpg",
          },
        ]}
        onPreviewPayInSlip={() => undefined}
      />
    )

    expect(html).toContain('data-testid="pay-in-slip-collector-report-1"')
    expect(html).toContain("bg-emerald-500")
  })
})
