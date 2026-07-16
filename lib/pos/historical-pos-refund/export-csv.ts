import fs from "fs"
import { rowsToCsvTable } from "@/lib/finance-ui/csv"
import type { HistoricalRefundPlan } from "./types"
import { buildStableHistoricalRefundNo } from "./source"

export function historicalRefundPlanToCsv(plan: HistoricalRefundPlan): string {
  const headers = [
    "refundNo",
    "branchCode",
    "legacyBranchId",
    "legacyRefundDate",
    "legacyTransNo",
    "sourceRowCount",
    "gross",
    "net",
    "vat",
    "staffId",
    "legacyStaffId",
    "skipReason",
  ] as const

  const rows = plan.documents.map((doc) => [
    buildStableHistoricalRefundNo({
      branchCode: doc.branchCode,
      legacyRefundDate: doc.legacyRefundDate,
      legacyTransNo: doc.legacyTransNo,
    }),
    doc.branchCode,
    doc.legacyBranchId,
    doc.legacyRefundDate,
    doc.legacyTransNo,
    doc.sourceRowCount,
    doc.gross.toFixed(2),
    doc.net.toFixed(2),
    doc.vat.toFixed(2),
    doc.staffId ?? "",
    doc.legacyStaffId ?? "",
    doc.skipReason ?? "",
  ])

  return rowsToCsvTable(headers, rows)
}

export function writeHistoricalRefundPlanCsv(
  plan: HistoricalRefundPlan,
  filename: string
): void {
  fs.writeFileSync(filename, historicalRefundPlanToCsv(plan), "utf8")
}
