import { renderToStaticMarkup } from "react-dom/server"
import { CollectorPickupSettlementTable } from "@/components/finance/CollectorPickupSettlementTable"
import { CollectorPickupSettlementStatusBadge } from "@/components/finance/CollectorPickupSettlementStatusBadge"
import { PayInConfirmModal } from "@/components/finance/PayInConfirmModal"
import { PayInSlipIndicator } from "@/components/finance/PayInSlipIndicator"
import {
  formatCollectorPickupPostError,
  CollectorPickupSettlementApiError,
} from "@/lib/finance-ui/collector-pickup-settlement"
import {
  collectorPickupSettlementActionHint,
  shouldShowCollectorPickupPostButton,
  shouldShowPayInButton,
} from "@/lib/finance-ui/collector-pickup-settlement-display"
import type { CollectorPickupSettlementReconciliation } from "@/lib/finance-ui/collector-pickup-settlement"

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
  payInEvidenceId: null,
  payInEvidenceStatus: null,
  payInEvidenceUrl: null,
  payInSlipMissingWarning: false,
  bankDepositDate: null,
  bankAccountCode: null,
}

describe("collector pickup settlement display helpers", () => {
  it("shows post button only for NOT_POSTED pickup", () => {
    expect(shouldShowCollectorPickupPostButton("NOT_POSTED")).toBe(true)
    expect(shouldShowCollectorPickupPostButton("POSTED")).toBe(false)
  })

  it("shows PAY-IN button when pickup posted and deposit not posted", () => {
    expect(
      shouldShowPayInButton({
        pickupStatus: "POSTED",
        depositStatus: "NOT_POSTED",
      })
    ).toBe(true)
    expect(
      shouldShowPayInButton({
        pickupStatus: "NOT_POSTED",
        depositStatus: "NOT_ELIGIBLE",
      })
    ).toBe(false)
  })

  it("formats duplicate-source and closed-period errors", () => {
    expect(
      formatCollectorPickupPostError(
        new CollectorPickupSettlementApiError(
          "duplicate",
          "DUPLICATE_SOURCE",
          409
        )
      )
    ).toContain("already posted")
  })

  it("shows missing slip hint for legacy posted deposit without evidence", () => {
    expect(
      collectorPickupSettlementActionHint({
        pickupStatus: "POSTED",
        depositStatus: "POSTED",
        payInSlipMissingWarning: true,
      })
    ).toBe("Missing slip")
  })
})

describe("PayInSlipIndicator", () => {
  it("renders upload label when no slip uploaded", () => {
    const html = renderToStaticMarkup(
      <PayInSlipIndicator status={null} onUpload={() => undefined} />
    )
    expect(html).toContain("Upload PAY-IN Slip")
  })

  it("renders view label when slip uploaded", () => {
    const html = renderToStaticMarkup(
      <PayInSlipIndicator
        status="UPLOADED"
        onPreview={() => undefined}
      />
    )
    expect(html).toContain("View PAY-IN Slip")
  })
})

describe("PayInConfirmModal", () => {
  it("disables confirm button without uploaded slip evidence", () => {
    const html = renderToStaticMarkup(
      <PayInConfirmModal
        open
        row={{
          collectorReportId: "collector-report-1",
          collectNo: "COL-SH001-202606-0001",
          branchLabel: "SH001 — Chidlom",
          inTransitAmount: "1000.00",
          payInEvidenceStatus: null,
          payInEvidenceUrl: null,
        }}
        onClose={() => undefined}
        onConfirmed={() => undefined}
      />
    )

    expect(html).toContain('data-testid="pay-in-confirm-modal"')
    expect(html).toContain('data-testid="pay-in-confirm-button"')
    expect(html).toContain("disabled")
  })
})

describe("CollectorPickupSettlementTable", () => {
  it("renders cash movement review columns", () => {
    const html = renderToStaticMarkup(
      <CollectorPickupSettlementTable
        items={[
          baseRow,
          {
            ...baseRow,
            collectorReportId: "collector-report-2",
            status: "POSTED",
            depositStatus: "NOT_POSTED",
            voucherNo: "V-2026-06-00001",
            variance: "0.00",
          },
        ]}
        onPost={() => undefined}
        onPayIn={() => undefined}
      />
    )

    expect(html).toContain("Pickup Status")
    expect(html).toContain("PAY-IN Slip")
    expect(html).toContain("Deposit Status")
    expect(html).toContain("Bank Voucher")
    expect(html).toContain("PAY-IN")
  })

  it("shows Post Settlement for NOT_POSTED pickup only", () => {
    const html = renderToStaticMarkup(
      <CollectorPickupSettlementTable
        items={[baseRow]}
        onPost={() => undefined}
      />
    )

    expect(html).toContain("Post Settlement")
    expect(html).toContain('data-testid="collector-pickup-post-collector-report-1"')
  })

  it("shows posted deposit row with bank voucher and slip indicator", () => {
    const html = renderToStaticMarkup(
      <CollectorPickupSettlementTable
        items={[
          {
            ...baseRow,
            status: "POSTED",
            depositStatus: "POSTED",
            voucherNo: "V-PICK-001",
            bankDepositVoucherNo: "V-BANK-001",
            payInEvidenceStatus: "UPLOADED",
            payInEvidenceUrl: "https://example.test/pay-in.jpg",
            variance: "0.00",
          },
        ]}
      />
    )

    expect(html).toContain("V-BANK-001")
    expect(html).toContain('data-testid="pay-in-slip-collector-report-1"')
    expect(html).toContain("Deposited")
  })
})

describe("CollectorPickupSettlementStatusBadge", () => {
  it("renders POSTED with green tone", () => {
    const html = renderToStaticMarkup(
      <CollectorPickupSettlementStatusBadge status="POSTED" />
    )
    expect(html).toContain("POSTED")
    expect(html).toContain("bg-green-100")
  })
})
