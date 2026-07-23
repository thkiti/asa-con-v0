import type { EndLine, StockDocument } from "@/generated/prisma/client"
import { formulasReconcile } from "./end-calc"
import { isInitialEndPeriod } from "./end-period"
import type { EndCompleteness, EndCompletenessIssue } from "./end-types"

export function evaluateEndCompleteness(input: {
  document: Pick<StockDocument, "periodMonth" | "endStatus">
  lines: ReadonlyArray<
    Pick<
      EndLine,
      | "productId"
      | "beginQty"
      | "inQty"
      | "usageQty"
      | "actualQty"
      | "countQty"
      | "endingQty"
      | "adjQty"
      | "priceIncomplete"
      | "countIncomplete"
      | "countManual"
      | "beginManual"
    >
  >
  countSourceMissing: boolean
  priorEndLocked: boolean
  periodHardClosed: boolean
  extraWarnings?: EndCompletenessIssue[]
}): EndCompleteness {
  const blockers: EndCompletenessIssue[] = []
  const warnings: EndCompletenessIssue[] = [...(input.extraWarnings ?? [])]
  const periodMonth = String(input.document.periodMonth ?? "")
  const initial = isInitialEndPeriod(periodMonth)

  if (input.periodHardClosed) {
    blockers.push({
      code: "PERIOD_HARD_CLOSED",
      message: "Accounting period is HARD_CLOSED",
      blocking: true,
    })
  }

  if (!initial && !input.priorEndLocked) {
    blockers.push({
      code: "PRIOR_END_NOT_LOCKED",
      message: "Previous period END must be locked",
      blocking: true,
    })
  }

  const allCountManual =
    input.lines.length > 0 && input.lines.every((l) => l.countManual && l.countQty != null)

  if (input.countSourceMissing) {
    if (initial && allCountManual) {
      warnings.push({
        code: "CNT_MISSING_MANUAL_OK",
        message: "No POSTED CNT; using 2026-01 manual COUNT",
        blocking: false,
      })
    } else if (initial) {
      blockers.push({
        code: "CNT_MISSING",
        message:
          "No POSTED CNT for period; 2026-01 requires manual COUNT on every line or a POSTED CNT",
        blocking: true,
      })
    } else {
      blockers.push({
        code: "CNT_MISSING",
        message: "No POSTED CNT for period",
        blocking: true,
      })
    }
  }

  for (const line of input.lines) {
    if (line.countQty == null || line.countIncomplete) {
      if (!(initial && line.countManual)) {
        blockers.push({
          code: "COUNT_INCOMPLETE",
          message: "COUNT is missing",
          blocking: true,
          productId: line.productId,
        })
      }
    }

    if (line.priceIncomplete) {
      blockers.push({
        code: "PRICE_INCOMPLETE",
        message: "Selling price snapshot missing",
        blocking: true,
        productId: line.productId,
      })
    }

    if (
      !formulasReconcile({
        beginQty: line.beginQty,
        inQty: line.inQty,
        usageQty: line.usageQty,
        actualQty: line.actualQty,
        countQty: line.countQty,
        endingQty: line.endingQty,
        adjQty: line.adjQty,
      })
    ) {
      blockers.push({
        code: "FORMULA_MISMATCH",
        message: "Derived quantities do not reconcile",
        blocking: true,
        productId: line.productId,
      })
    }
  }

  if (input.lines.length === 0) {
    warnings.push({
      code: "NO_LINES",
      message: "END has no product lines",
      blocking: false,
    })
  }

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
  }
}

export function serializeCompletenessNotes(completeness: EndCompleteness): string {
  return JSON.stringify({
    blockers: completeness.blockers,
    warnings: completeness.warnings,
  })
}
