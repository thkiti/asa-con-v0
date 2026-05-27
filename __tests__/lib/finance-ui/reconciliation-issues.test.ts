import {
  buildIssuesQuery,
  deriveIssueStatus,
  filterIssueRows,
  issueMatchesDomain,
} from "@/lib/finance-ui/reconciliation-issues"
import type { ReconciliationIssueRow } from "@/lib/finance-ui/reconciliation-issues"

describe("deriveIssueStatus", () => {
  it("maps MISSING_VOUCHER to MISSING_GL", () => {
    expect(
      deriveIssueStatus({
        sourceType: "SALE",
        sourceId: "sale-1",
        issueType: "MISSING_VOUCHER",
        severity: "ERROR",
        message: "missing",
      })
    ).toBe("MISSING_GL")
  })

  it("maps amount mismatch to VARIANCE", () => {
    expect(
      deriveIssueStatus({
        sourceType: "SALE",
        sourceId: "sale-1",
        issueType: "TOTAL_MISMATCH",
        severity: "ERROR",
        message: "mismatch",
        expectedAmount: 100,
        actualAmount: 90,
        difference: 10,
      })
    ).toBe("VARIANCE")
  })
})

describe("issueMatchesDomain", () => {
  it("maps inventory domain to stock document issues", () => {
    expect(
      issueMatchesDomain(
        {
          sourceType: "STOCK_DOCUMENT",
          issueType: "INVENTORY_VALUE_MISMATCH",
        },
        "inventory"
      )
    ).toBe(true)
  })

  it("maps revenue domain to sale revenue issues", () => {
    expect(
      issueMatchesDomain(
        {
          sourceType: "SALE",
          issueType: "TOTAL_MISMATCH",
        },
        "revenue"
      )
    ).toBe(true)
  })
})

describe("filterIssueRows", () => {
  const rows: ReconciliationIssueRow[] = [
    {
      id: "1",
      sourceType: "SALE",
      sourceId: "sale-1",
      documentRef: "sale-1",
      issueType: "MISSING_VOUCHER",
      severity: "ERROR",
      status: "MISSING_GL",
      message: "missing voucher",
      expectedAmount: null,
      actualAmount: null,
      difference: null,
      vouchers: [],
      journalEntries: [],
      sourceCreatedAt: null,
      sourcePostedAt: null,
    },
    {
      id: "2",
      sourceType: "STOCK_DOCUMENT",
      sourceId: "doc-1",
      documentRef: "PUR-1",
      issueType: "INVENTORY_VALUE_MISMATCH",
      severity: "ERROR",
      status: "VARIANCE",
      message: "inventory mismatch",
      expectedAmount: 100,
      actualAmount: 90,
      difference: 10,
      vouchers: [
        {
          id: "v1",
          voucherNo: "V001",
          refType: "STOCK_DOC_POST",
          refId: "doc-1",
          postedAt: null,
        },
      ],
      journalEntries: [],
      sourceCreatedAt: null,
      sourcePostedAt: "2026-05-02T00:00:00.000Z",
    },
  ]

  it("filters by sourceType", () => {
    expect(filterIssueRows(rows, { sourceType: "SALE" })).toHaveLength(1)
  })

  it("filters by status", () => {
    expect(filterIssueRows(rows, { status: "VARIANCE" })).toHaveLength(1)
  })
})

describe("buildIssuesQuery", () => {
  it("includes drill-down filters", () => {
    expect(
      buildIssuesQuery({
        branchId: "branch-1",
        from: "2026-05-01",
        to: "2026-05-31",
        domain: "inventory",
        status: "VARIANCE",
      })
    ).toBe(
      "?branchId=branch-1&from=2026-05-01&to=2026-05-31&status=VARIANCE&domain=inventory"
    )
  })
})
