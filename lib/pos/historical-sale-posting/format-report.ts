import {
  decimalToMoneyString,
  serializeEconomicsTotals,
} from "./economics"
import type { HistoricalPostingPlan } from "./types"

function pad(value: string, width: number): string {
  return value.length >= width ? value : value.padEnd(width)
}

export function formatHistoricalPostingShopTable(
  plan: HistoricalPostingPlan
): string {
  const headers = [
    "branch",
    "sales",
    "gross",
    "calcNet",
    "calcVat",
    "cogs",
    "tender",
  ]
  const widths = [10, 6, 12, 12, 12, 12, 12]
  const lines = [
    headers.map((h, i) => pad(h, widths[i]!)).join(" "),
    widths.map((w) => "-".repeat(w)).join(" "),
  ]

  for (const shop of plan.shopSummaries) {
    lines.push(
      [
        pad(shop.branchCode, widths[0]!),
        pad(String(shop.eligibleCount), widths[1]!),
        pad(decimalToMoneyString(shop.grossTotal), widths[2]!),
        pad(decimalToMoneyString(shop.calculatedNetTotal), widths[3]!),
        pad(decimalToMoneyString(shop.calculatedVatTotal), widths[4]!),
        pad(decimalToMoneyString(shop.cogsTotal), widths[5]!),
        pad(decimalToMoneyString(shop.tenderTotal), widths[6]!),
      ].join(" ")
    )
  }

  const grand = plan.grandSummary
  lines.push(
    widths.map((w) => "-".repeat(w)).join(" "),
    [
      pad("TOTAL", widths[0]!),
      pad(String(grand.eligibleCount), widths[1]!),
      pad(decimalToMoneyString(grand.grossTotal), widths[2]!),
      pad(decimalToMoneyString(grand.calculatedNetTotal), widths[3]!),
      pad(decimalToMoneyString(grand.calculatedVatTotal), widths[4]!),
      pad(decimalToMoneyString(grand.cogsTotal), widths[5]!),
      pad(decimalToMoneyString(grand.tenderTotal), widths[6]!),
    ].join(" ")
  )

  return lines.join("\n")
}

export function formatHistoricalPostingSampleTable(
  plan: HistoricalPostingPlan
): string {
  const headers = [
    "branch",
    "receiptNo",
    "saleDate",
    "gross",
    "calcNet",
    "calcVat",
    "cogs",
  ]
  const widths = [10, 24, 12, 12, 12, 12, 12]
  const lines = [
    headers.map((h, i) => pad(h, widths[i]!)).join(" "),
    widths.map((w) => "-".repeat(w)).join(" "),
  ]

  for (const shop of plan.shopSummaries) {
    for (const row of shop.sampleRows) {
      lines.push(
        [
          pad(row.branchCode, widths[0]!),
          pad(row.receiptNo, widths[1]!),
          pad(row.saleDate, widths[2]!),
          pad(row.gross, widths[3]!),
          pad(row.calculatedNet, widths[4]!),
          pad(row.calculatedVat, widths[5]!),
          pad(row.cogs, widths[6]!),
        ].join(" ")
      )
    }
  }

  return lines.join("\n")
}

export function formatHistoricalPostingReconciliationTable(
  plan: HistoricalPostingPlan
): string {
  const headers = ["check", "result", "left", "right", "difference"]
  const widths = [28, 6, 16, 16, 12]
  const lines = [
    headers.map((h, i) => pad(h, widths[i]!)).join(" "),
    widths.map((w) => "-".repeat(w)).join(" "),
  ]

  for (const check of plan.reconciliation.checks) {
    lines.push(
      [
        pad(check.name, widths[0]!),
        pad(check.pass ? "PASS" : "FAIL", widths[1]!),
        pad(`${check.leftLabel}=${check.leftValue}`, widths[2]!),
        pad(`${check.rightLabel}=${check.rightValue}`, widths[3]!),
        pad(check.difference, widths[4]!),
      ].join(" ")
    )
  }

  return lines.join("\n")
}

export function formatHistoricalPostingStructuredSummary(
  plan: HistoricalPostingPlan
): string {
  return JSON.stringify(
    {
      range: {
        from: plan.range.fromDateKey,
        before: plan.range.beforeDateKey,
      },
      branchFilter: plan.branchFilter ?? null,
      limit: plan.limit ?? null,
      totals: {
        totalSales: plan.totalSales,
        eligibleCount: plan.eligibleCount,
        expectedVoucherCount: plan.expectedVoucherCount,
        skipCounts: plan.skipCounts,
      },
      grandSummary: {
        salesCount: plan.grandSummary.salesCount,
        receiptCount: plan.grandSummary.receiptCount,
        eligibleCount: plan.grandSummary.eligibleCount,
        skippedCount: plan.grandSummary.skippedCount,
        voucherCount: plan.grandSummary.voucherCount,
        ...serializeEconomicsTotals(plan.grandSummary),
      },
      reconciliation: plan.reconciliation,
      shopSummaries: plan.shopSummaries.map((shop) => ({
        branchCode: shop.branchCode,
        branchName: shop.branchName,
        salesCount: shop.salesCount,
        receiptCount: shop.receiptCount,
        eligibleCount: shop.eligibleCount,
        skippedCount: shop.skippedCount,
        voucherCount: shop.voucherCount,
        ...serializeEconomicsTotals(shop),
        sampleRows: shop.sampleRows,
      })),
    },
    null,
    2
  )
}

export function formatHistoricalPostingSkipSummary(plan: HistoricalPostingPlan): string {
  const c = plan.skipCounts
  return [
    `skipped already posted: ${c.ALREADY_POSTED}`,
    `skipped no receipt: ${c.NO_RECEIPT}`,
    `skipped multiple receipts: ${c.MULTIPLE_RECEIPTS}`,
    `skipped missing payment: ${c.MISSING_PAYMENT}`,
    `skipped missing posting data: ${c.MISSING_POSTING_DATA}`,
    `skipped period closed: ${c.PERIOD_CLOSED}`,
    `skipped period not opened: ${c.PERIOD_NOT_OPENED}`,
    `skipped incomplete voucher: ${c.INCOMPLETE_VOUCHER}`,
  ].join("\n")
}
