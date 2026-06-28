import { renderToStaticMarkup } from "react-dom/server"
import { BankDepositSettlementTable } from "@/components/finance/BankDepositSettlementTable"
import {
  bankDepositSettlementActionHint,
  shouldShowBankDepositPayInButton,
} from "@/lib/finance-ui/bank-deposit-settlement-display"
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
  it("shows PAY-IN button only for NOT_POSTED deposit rows", () => {
    expect(shouldShowBankDepositPayInButton("NOT_POSTED")).toBe(true)
    expect(shouldShowBankDepositPayInButton("POSTED")).toBe(false)
  })

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
  it("renders PAY-IN slip column and action", () => {
    const html = renderToStaticMarkup(
      <BankDepositSettlementTable
        items={[baseRow]}
        onPayIn={() => undefined}
      />
    )

    expect(html).toContain("PAY-IN Slip")
    expect(html).toContain("PAY-IN")
    expect(html).toContain('data-testid="pay-in-open-collector-report-1"')
  })

  it("shows deposited row with voucher and uploaded slip indicator", () => {
    const html = renderToStaticMarkup(
      <BankDepositSettlementTable
        items={[
          {
            ...baseRow,
            status: "POSTED",
            voucherNo: "V-BANK-001",
            variance: "0.00",
            payInEvidenceStatus: "UPLOADED",
            payInEvidenceUrl: "https://example.test/pay-in.jpg",
          },
        ]}
      />
    )

    expect(html).toContain("V-BANK-001")
    expect(html).toContain("Deposited")
    expect(html).toContain('data-testid="pay-in-slip-collector-report-1"')
  })

  it("shows missing slip warning without crashing", () => {
    const html = renderToStaticMarkup(
      <BankDepositSettlementTable
        items={[
          {
            ...baseRow,
            status: "POSTED",
            voucherNo: "V-BANK-LEGACY",
            variance: "0.00",
            payInSlipMissingWarning: true,
          },
        ]}
      />
    )

    expect(html).toContain("Missing slip")
    expect(html).toContain("V-BANK-LEGACY")
  })
})
