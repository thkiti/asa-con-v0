import { renderToStaticMarkup } from "react-dom/server"
import { BankDepositSettlementTable } from "@/components/finance/BankDepositSettlementTable"
import { BankDepositSettlementStatusBadge } from "@/components/finance/BankDepositSettlementStatusBadge"
import {
  formatBankDepositPostError,
  BankDepositSettlementApiError,
} from "@/lib/finance-ui/bank-deposit-settlement"
import {
  bankDepositSettlementActionHint,
  shouldShowBankDepositPostButton,
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
  collectorPickupVoucherNo: "V-2026-06-00001",
  voucherId: null,
  voucherNo: null,
  glDebitBank1021: "0.00",
  glCreditCashInTransit1031: "0.00",
  postedAmountEquivalent: "0.00",
  variance: "1000.00",
  status: "NOT_POSTED",
}

describe("bank deposit settlement display helpers", () => {
  it("shows post button only for NOT_POSTED", () => {
    expect(shouldShowBankDepositPostButton("NOT_POSTED")).toBe(true)
    expect(shouldShowBankDepositPostButton("POSTED")).toBe(false)
    expect(shouldShowBankDepositPostButton("VARIANCE")).toBe(false)
    expect(shouldShowBankDepositPostButton("INVALID_SOURCE")).toBe(false)
    expect(shouldShowBankDepositPostButton("NOT_ELIGIBLE")).toBe(false)
  })

  it("formats duplicate-source, pickup-not-posted, and closed-period errors", () => {
    expect(
      formatBankDepositPostError(
        new BankDepositSettlementApiError(
          "duplicate",
          "DUPLICATE_SOURCE",
          409
        )
      )
    ).toContain("already posted")
    expect(
      formatBankDepositPostError(
        new BankDepositSettlementApiError(
          "pickup",
          "COLLECTOR_PICKUP_NOT_POSTED",
          409
        )
      )
    ).toContain("Collector pickup")
    expect(
      formatBankDepositPostError(
        new BankDepositSettlementApiError("closed", "PERIOD_CLOSED", 409)
      )
    ).toContain("period is closed")
  })
})

describe("BankDepositSettlementStatusBadge", () => {
  it("renders POSTED with green tone", () => {
    const html = renderToStaticMarkup(
      <BankDepositSettlementStatusBadge status="POSTED" />
    )
    expect(html).toContain("POSTED")
    expect(html).toContain("bg-green-100")
  })
})

describe("BankDepositSettlementTable", () => {
  it("renders date-filter-driven status rows", () => {
    const html = renderToStaticMarkup(
      <BankDepositSettlementTable
        items={[
          baseRow,
          {
            ...baseRow,
            collectorReportId: "collector-report-2",
            collectNo: "COL-SH001-202606-0002",
            status: "POSTED",
            voucherId: "voucher-1",
            voucherNo: "V-2026-06-00002",
            variance: "0.00",
            glDebitBank1021: "1000.00",
            glCreditCashInTransit1031: "1000.00",
            postedAmountEquivalent: "1000.00",
          },
        ]}
        onPost={() => undefined}
      />
    )

    expect(html).toContain('data-testid="bank-deposit-settlement-table"')
    expect(html).toContain("COL-SH001-202606-0001")
    expect(html).toContain("COL-SH001-202606-0002")
    expect(html).toContain("1,000.00")
  })

  it("shows Post Deposit for NOT_POSTED only", () => {
    const html = renderToStaticMarkup(
      <BankDepositSettlementTable
        items={[
          baseRow,
          {
            ...baseRow,
            collectorReportId: "collector-report-2",
            status: "POSTED",
            voucherNo: "V-2026-06-00002",
            variance: "0.00",
          },
        ]}
        onPost={() => undefined}
      />
    )

    expect(html).toContain("Post Deposit")
    expect(html).toContain('data-testid="bank-deposit-post-collector-report-1"')
    expect(html).not.toContain('data-testid="bank-deposit-post-collector-report-2"')
    expect(html).toContain("V-2026-06-00002")
    expect(html).toContain(bankDepositSettlementActionHint("POSTED")!)
  })

  it("shows warning hint for NOT_ELIGIBLE and no post button", () => {
    const html = renderToStaticMarkup(
      <BankDepositSettlementTable
        items={[
          {
            ...baseRow,
            collectorPickupVoucherId: null,
            collectorPickupVoucherNo: null,
            status: "NOT_ELIGIBLE",
          },
        ]}
        onPost={() => undefined}
      />
    )

    expect(html).not.toContain("Post Deposit")
    expect(html).toContain("Collector pickup not posted")
  })
})
