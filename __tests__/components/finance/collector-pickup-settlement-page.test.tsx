import { renderToStaticMarkup } from "react-dom/server"
import { CollectorPickupSettlementTable } from "@/components/finance/CollectorPickupSettlementTable"
import { PayInSlipIndicator } from "@/components/finance/PayInSlipIndicator"
import { PayInSlipUploadModal } from "@/components/finance/PayInSlipUploadModal"
import { PayInStaffCredentialGate } from "@/components/finance/PayInStaffCredentialGate"
import { getFinanceMenuHub } from "@/lib/main-ui/finance-menu"
import {
  formatCollectorPickupPostError,
  CollectorPickupSettlementApiError,
} from "@/lib/finance-ui/collector-pickup-settlement"
import {
  mapCollectorPickupBusinessStatus,
  shouldShowDepositPostButton,
  shouldShowDepositPostDisabled,
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
  it("maps pickup posted to COLLECTED", () => {
    expect(mapCollectorPickupBusinessStatus("POSTED")).toBe("COLLECTED")
  })

  it("maps legacy not posted to NEEDS REPAIR", () => {
    expect(mapCollectorPickupBusinessStatus("NOT_POSTED")).toBe("NEEDS REPAIR")
  })

  it("maps invalid source to NOT COLLECTED", () => {
    expect(mapCollectorPickupBusinessStatus("INVALID_SOURCE")).toBe("NOT COLLECTED")
  })

  it("shows deposit POST only when slip uploaded", () => {
    expect(
      shouldShowDepositPostButton({
        pickupStatus: "POSTED",
        depositStatus: "NOT_POSTED",
        payInEvidenceStatus: "UPLOADED",
      })
    ).toBe(true)
    expect(
      shouldShowDepositPostDisabled({
        pickupStatus: "POSTED",
        depositStatus: "NOT_POSTED",
        payInEvidenceStatus: null,
      })
    ).toBe(true)
  })

  it("formats duplicate-source errors", () => {
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
})

describe("finance menu", () => {
  it("does not show separate Bank Deposit Settlement in daily work", () => {
    const hub = getFinanceMenuHub("HO_FINANCE", "daily-work")
    const labels = hub?.items.map((item) => item.label) ?? []
    expect(labels).toContain("Collector Pickup Settlement")
    expect(labels).not.toContain("Bank Deposit Settlement")
  })
})

describe("PayInSlipIndicator", () => {
  it("renders small dim dot when no slip uploaded", () => {
    const html = renderToStaticMarkup(
      <PayInSlipIndicator status={null} onUpload={() => undefined} />
    )
    expect(html).toContain("Upload PAY-IN Slip")
    expect(html).toContain("h-3 w-3")
    expect(html).toContain("bg-zinc-200")
  })

  it("renders green dot when slip uploaded", () => {
    const html = renderToStaticMarkup(
      <PayInSlipIndicator status="UPLOADED" onPreview={() => undefined} />
    )
    expect(html).toContain("View PAY-IN Slip")
    expect(html).toContain("bg-emerald-500")
  })
})

describe("PayInStaffCredentialGate", () => {
  it("renders staff credential prompt", () => {
    const html = renderToStaticMarkup(
      <PayInStaffCredentialGate
        open
        collectNo="COL-SH001-202606-0001"
        onClose={() => undefined}
        onVerified={() => undefined}
      />
    )
    expect(html).toContain('data-testid="pay-in-staff-credential-gate"')
    expect(html).toContain('data-testid="pay-in-staff-credential-input"')
  })
})

describe("PayInSlipUploadModal", () => {
  it("shows collectNo-staffId storage name and disabled save without file", () => {
    const html = renderToStaticMarkup(
      <PayInSlipUploadModal
        open
        row={{
          collectorReportId: "collector-report-1",
          collectNo: "COL-SH001-202606-0001",
          branchLabel: "SH001 — Chidlom",
        }}
        verifiedStaff={{ staffId: "001", staffName: "Collector" }}
        onClose={() => undefined}
        onSaved={() => undefined}
      />
    )

    expect(html).toContain('data-testid="pay-in-slip-upload-modal"')
    expect(html).toContain("COL-SH001-202606-0001-001.jpg")
    expect(html).toContain('data-testid="pay-in-slip-save-button"')
    expect(html).toContain("disabled")
  })
})

describe("CollectorPickupSettlementTable", () => {
  it("renders simplified columns only", () => {
    const html = renderToStaticMarkup(
      <CollectorPickupSettlementTable items={[baseRow]} />
    )

    expect(html).toContain("Collect No")
    expect(html).toContain("Branch")
    expect(html).toContain("Expected")
    expect(html).toContain("Status")
    expect(html).toContain("PAY-IN Slip")
    expect(html).toContain("Deposit")
    expect(html).not.toContain("Pickup Voucher")
    expect(html).not.toContain("Bank Voucher")
    expect(html).not.toContain("Pickup Status")
    expect(html).not.toContain("Post Settlement")
  })

  it("shows COLLECTED for pickup-posted row", () => {
    const html = renderToStaticMarkup(
      <CollectorPickupSettlementTable
        items={[
          {
            ...baseRow,
            status: "POSTED",
            depositStatus: "NOT_POSTED",
            variance: "0.00",
          },
        ]}
      />
    )

    expect(html).toContain("COLLECTED")
  })

  it("shows NEEDS REPAIR for legacy not posted pickup", () => {
    const html = renderToStaticMarkup(
      <CollectorPickupSettlementTable items={[baseRow]} />
    )

    expect(html).toContain("NEEDS REPAIR")
  })

  it("shows disabled deposit POST without slip and active POST with slip", () => {
    const html = renderToStaticMarkup(
      <CollectorPickupSettlementTable
        items={[
          {
            ...baseRow,
            status: "POSTED",
            depositStatus: "NOT_POSTED",
            payInEvidenceStatus: null,
            variance: "0.00",
          },
          {
            ...baseRow,
            collectorReportId: "collector-report-2",
            status: "POSTED",
            depositStatus: "NOT_POSTED",
            payInEvidenceStatus: "UPLOADED",
            payInEvidenceUrl: "https://example.test/pay-in.jpg",
            variance: "0.00",
          },
        ]}
        onDepositPost={() => undefined}
      />
    )

    expect(html).toContain('data-testid="deposit-post-disabled-collector-report-1"')
    expect(html).toContain('data-testid="deposit-post-collector-report-2"')
  })

  it("shows POSTED in deposit column after bank deposit posted", () => {
    const html = renderToStaticMarkup(
      <CollectorPickupSettlementTable
        items={[
          {
            ...baseRow,
            status: "POSTED",
            depositStatus: "POSTED",
            payInEvidenceStatus: "UPLOADED",
            payInEvidenceUrl: "https://example.test/pay-in.jpg",
            variance: "0.00",
          },
        ]}
      />
    )

    expect(html).toContain('data-testid="deposit-posted-collector-report-1"')
    expect(html).toContain("POSTED")
    expect(html).not.toContain("V-")
  })
})
