import { renderToStaticMarkup } from "react-dom/server"
import { CollectorPickupSettlementTable } from "@/components/finance/CollectorPickupSettlementTable"
import { CollectorPickupSettlementStatusBadge } from "@/components/finance/CollectorPickupSettlementStatusBadge"
import {
  formatCollectorPickupPostError,
  CollectorPickupSettlementApiError,
} from "@/lib/finance-ui/collector-pickup-settlement"
import {
  collectorPickupSettlementActionHint,
  shouldShowCollectorPickupPostButton,
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
}

describe("collector pickup settlement display helpers", () => {
  it("shows post button only for NOT_POSTED", () => {
    expect(shouldShowCollectorPickupPostButton("NOT_POSTED")).toBe(true)
    expect(shouldShowCollectorPickupPostButton("POSTED")).toBe(false)
    expect(shouldShowCollectorPickupPostButton("VARIANCE")).toBe(false)
    expect(shouldShowCollectorPickupPostButton("INVALID_SOURCE")).toBe(false)
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
    expect(
      formatCollectorPickupPostError(
        new CollectorPickupSettlementApiError("closed", "PERIOD_CLOSED", 409)
      )
    ).toContain("period is closed")
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

describe("CollectorPickupSettlementTable", () => {
  it("renders date-filter-driven status rows", () => {
    const html = renderToStaticMarkup(
      <CollectorPickupSettlementTable
        items={[
          baseRow,
          {
            ...baseRow,
            collectorReportId: "collector-report-2",
            collectNo: "COL-SH001-202606-0002",
            status: "POSTED",
            voucherId: "voucher-1",
            voucherNo: "V-2026-06-00001",
            variance: "0.00",
            glDebitCashInTransit1031: "1000.00",
            glCreditCashDrawer1001: "1000.00",
            postedAmountEquivalent: "1000.00",
          },
        ]}
        onPost={() => undefined}
      />
    )

    expect(html).toContain('data-testid="collector-pickup-settlement-table"')
    expect(html).toContain("COL-SH001-202606-0001")
    expect(html).toContain("COL-SH001-202606-0002")
    expect(html).toContain("1,000.00")
  })

  it("shows Post Settlement for NOT_POSTED only", () => {
    const html = renderToStaticMarkup(
      <CollectorPickupSettlementTable
        items={[
          baseRow,
          {
            ...baseRow,
            collectorReportId: "collector-report-2",
            status: "POSTED",
            voucherNo: "V-2026-06-00001",
            variance: "0.00",
          },
        ]}
        onPost={() => undefined}
      />
    )

    expect(html).toContain("Post Settlement")
    expect(html).toContain('data-testid="collector-pickup-post-collector-report-1"')
    expect(html).not.toContain('data-testid="collector-pickup-post-collector-report-2"')
    expect(html).toContain("V-2026-06-00001")
    expect(html).toContain(collectorPickupSettlementActionHint("POSTED")!)
  })

  it("shows warning hint for VARIANCE and no post button", () => {
    const html = renderToStaticMarkup(
      <CollectorPickupSettlementTable
        items={[
          {
            ...baseRow,
            status: "VARIANCE",
            variance: "100.00",
          },
        ]}
        onPost={() => undefined}
      />
    )

    expect(html).not.toContain("Post Settlement")
    expect(html).toContain("Variance")
  })

  it("shows no post button for INVALID_SOURCE", () => {
    const html = renderToStaticMarkup(
      <CollectorPickupSettlementTable
        items={[
          {
            ...baseRow,
            mode: "Z",
            status: "INVALID_SOURCE",
            variance: "0.00",
          },
        ]}
        onPost={() => undefined}
      />
    )

    expect(html).not.toContain("Post Settlement")
    expect(html).toContain("Not eligible")
  })
})
