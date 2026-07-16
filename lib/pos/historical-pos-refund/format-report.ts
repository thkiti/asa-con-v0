import type {
  HistoricalRefundExecuteResult,
  HistoricalRefundPlan,
} from "./types"
import {
  HISTORICAL_REFUND_OUTPUT_VAT_ACCOUNT,
  HISTORICAL_REFUND_REVENUE_ACCOUNT,
  HISTORICAL_REFUND_TENDER_ACCOUNT,
} from "./constants"
import { buildStableHistoricalRefundNo } from "./source"

export function formatHistoricalRefundPlanReport(plan: HistoricalRefundPlan): string {
  const lines: string[] = []
  lines.push("=== Historical POS Refund Import Plan (dry-run) ===")
  lines.push(`Source file: ${plan.sourceFilePath}`)
  lines.push(`Source basename: ${plan.sourceFileName}`)
  lines.push(`Date range: ${plan.fromDateKey} .. < ${plan.beforeDateKey} (Bangkok)`)
  lines.push("")
  lines.push(`Source R rows: ${plan.totals.sourceRows}`)
  lines.push(`Grouped documents: ${plan.totals.documents}`)
  lines.push(`Eligible import: ${plan.totals.eligibleImport}`)
  lines.push(`Already imported: ${plan.totals.alreadyImported}`)
  lines.push(`Eligible posting: ${plan.totals.eligiblePosting}`)
  lines.push(`Already posted: ${plan.totals.alreadyPosted}`)
  lines.push(`Incomplete voucher: ${plan.totals.incompleteVoucher}`)
  lines.push(`Missing branch: ${plan.totals.missingBranch}`)
  lines.push(`Missing staff (warning): ${plan.totals.missingStaff}`)
  lines.push(`Zero amount: ${plan.totals.zeroAmount}`)
  lines.push("")
  lines.push("Accounts (money-only):")
  lines.push(`  Dr ${HISTORICAL_REFUND_REVENUE_ACCOUNT} net`)
  lines.push(`  Dr ${HISTORICAL_REFUND_OUTPUT_VAT_ACCOUNT} VAT`)
  lines.push(`  Cr ${HISTORICAL_REFUND_TENDER_ACCOUNT} Cash gross`)
  lines.push("")
  lines.push("By branch:")
  lines.push("branch\tdocs\tgross\tnet\tvat")
  for (const row of plan.byBranch) {
    lines.push(
      `${row.branchCode}\t${row.documents}\t${row.gross}\t${row.net}\t${row.vat}`
    )
  }
  lines.push("")
  lines.push("Grand totals:")
  lines.push(`  Gross: ${plan.totals.gross}`)
  lines.push(`  Net:   ${plan.totals.net}`)
  lines.push(`  VAT:   ${plan.totals.vat}`)
  lines.push(
    `  Check: Gross = Net + VAT → ${plan.totals.gross} = ${plan.totals.net} + ${plan.totals.vat}`
  )
  lines.push("")
  lines.push("Sample documents:")
  for (const doc of plan.sampleDocuments) {
    const refundNo = buildStableHistoricalRefundNo({
      branchCode: doc.branchCode,
      legacyRefundDate: doc.legacyRefundDate,
      legacyTransNo: doc.legacyTransNo,
    })
    lines.push(
      [
        refundNo,
        doc.branchCode,
        doc.legacyRefundDate,
        doc.legacyTransNo,
        `lines=${doc.sourceRowCount}`,
        `gross=${doc.gross.toFixed(2)}`,
        `net=${doc.net.toFixed(2)}`,
        `vat=${doc.vat.toFixed(2)}`,
        doc.skipReason ?? "ELIGIBLE",
      ].join(" | ")
    )
  }
  return lines.join("\n")
}

export function formatHistoricalRefundExecuteReport(
  result: HistoricalRefundExecuteResult
): string {
  const lines: string[] = []
  lines.push("=== Historical POS Refund Import Execute ===")
  lines.push(`Attempted import: ${result.attemptedImport}`)
  lines.push(`Imported: ${result.imported}`)
  lines.push(`Skipped already imported: ${result.skippedAlreadyImported}`)
  lines.push(`Attempted posting: ${result.attemptedPosting}`)
  lines.push(`Posted: ${result.posted}`)
  lines.push(`Already posted: ${result.alreadyPosted}`)
  lines.push(`Failed: ${result.failed.length}`)
  if (result.failed.length > 0) {
    for (const fail of result.failed.slice(0, 20)) {
      lines.push(`  - ${fail.key}: ${fail.error}`)
    }
  }
  return lines.join("\n")
}
