import { AccountingPeriodStatus } from "@/generated/prisma/client"
import {
  financeErrorResponse,
  parseAccountingPeriodStatus,
} from "@/app/api/finance/shared/finance-api-errors"
import { ClosePolicyError } from "@/lib/finance/close-policy"
import { CloseGateError } from "@/lib/finance/close-gate-errors"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { ReconciliationError } from "@/lib/finance/reconciliation-errors"
import { ReconciliationSnapshotError } from "@/lib/finance/reconciliation-snapshot-errors"
import { InvalidDateRangeError } from "@/lib/reporting/report-errors"

describe("parseAccountingPeriodStatus", () => {
  it("parses known enum values case-insensitively", () => {
    expect(parseAccountingPeriodStatus("soft_closed")).toBe(
      AccountingPeriodStatus.SOFT_CLOSED
    )
  })

  it("returns null for unknown values", () => {
    expect(parseAccountingPeriodStatus("ARCHIVED")).toBeNull()
  })
})

describe("financeErrorResponse", () => {
  it("maps InvalidDateRangeError to 400 JSON", async () => {
    const res = financeErrorResponse(
      new InvalidDateRangeError("from must be on or before to"),
      "test"
    )
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "from must be on or before to",
      code: "INVALID_DATE_RANGE",
    })
  })

  it("maps ReconciliationError ACCOUNT_NOT_FOUND to 404", async () => {
    const res = financeErrorResponse(
      new ReconciliationError("GL balance missing", "ACCOUNT_NOT_FOUND"),
      "test"
    )
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      error: "GL balance missing",
      code: "ACCOUNT_NOT_FOUND",
    })
  })

  it("maps ClosePolicyError to 400 JSON", async () => {
    const res = financeErrorResponse(
      new ClosePolicyError("Close transition requires an audit reason", "REASON_REQUIRED"),
      "test"
    )
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "Close transition requires an audit reason",
      code: "REASON_REQUIRED",
    })
  })

  it("maps CloseGateError to 409 JSON with blockers", async () => {
    const err = new CloseGateError(
      "Period close blocked: 1 blocker must be resolved",
      "CLOSE_SNAPSHOT_REQUIRED",
      "BLOCKED",
      [
        {
          id: "snapshot-missing",
          group: "snapshot_evidence",
          severity: "BLOCKED",
          title: "No reconciliation snapshot for period",
          detail: "Capture a frozen reconciliation snapshot before close.",
        },
      ]
    )
    const res = financeErrorResponse(err, "test")
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      error: err.message,
      code: "CLOSE_SNAPSHOT_REQUIRED",
      readinessStatus: "BLOCKED",
      blockers: err.blockers,
    })
  })

  it("maps CloseGateError CLOSE_BLOCKED to 409 JSON", async () => {
    const err = new CloseGateError(
      "Period close blocked: 1 blocker must be resolved",
      "CLOSE_BLOCKED",
      "BLOCKED",
      [
        {
          id: "reconciliation-missing-gl-issues",
          group: "reconciliation",
          severity: "BLOCKED",
          title: "Missing GL issues",
          detail: "resolve",
        },
      ]
    )
    const res = financeErrorResponse(err, "test")
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      error: err.message,
      code: "CLOSE_BLOCKED",
      readinessStatus: "BLOCKED",
      blockers: err.blockers,
    })
  })

  it("maps CloseGateError CLOSE_READINESS_FAILED to 409 JSON", async () => {
    const err = new CloseGateError(
      "Period close blocked: 1 blocker must be resolved",
      "CLOSE_READINESS_FAILED",
      "WARNING",
      [
        {
          id: "snapshot-stale",
          group: "snapshot_evidence",
          severity: "WARNING",
          title: "Snapshot may be stale",
          detail: "stale",
        },
      ]
    )
    const res = financeErrorResponse(err, "test")
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      error: err.message,
      code: "CLOSE_READINESS_FAILED",
      readinessStatus: "WARNING",
      blockers: err.blockers,
    })
  })

  it("maps FinancePostingError PERIOD_NOT_FOUND to 404", async () => {
    const res = financeErrorResponse(
      new FinancePostingError("Accounting period 2026-05 not found", "PERIOD_NOT_FOUND"),
      "test"
    )
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      error: "Accounting period 2026-05 not found",
      code: "PERIOD_NOT_FOUND",
    })
  })

  it("maps FinancePostingError CLOSE_EVIDENCE_NOT_FOUND to 404", async () => {
    const res = financeErrorResponse(
      new FinancePostingError(
        "Close evidence not found for period: period-1",
        "CLOSE_EVIDENCE_NOT_FOUND"
      ),
      "test"
    )
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      error: "Close evidence not found for period: period-1",
      code: "CLOSE_EVIDENCE_NOT_FOUND",
    })
  })

  it("maps FinancePostingError PERIOD_ALREADY_HARD_CLOSED to 409", async () => {
    const res = financeErrorResponse(
      new FinancePostingError(
        "Accounting period 2026-05 is hard closed and cannot be reopened",
        "PERIOD_ALREADY_HARD_CLOSED"
      ),
      "test"
    )
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      error: "Accounting period 2026-05 is hard closed and cannot be reopened",
      code: "PERIOD_ALREADY_HARD_CLOSED",
    })
  })

  it("maps other FinancePostingError codes to 400", async () => {
    const res = financeErrorResponse(
      new FinancePostingError("Period is not open for posting", "PERIOD_NOT_OPEN"),
      "test"
    )
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "Period is not open for posting",
      code: "PERIOD_NOT_OPEN",
    })
  })

  it("maps ReconciliationSnapshotError INVALID_SCOPE to 400", async () => {
    const res = financeErrorResponse(
      new ReconciliationSnapshotError(
        "fromDate and toDate are required when periodKey is omitted",
        "INVALID_SCOPE"
      ),
      "test"
    )
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "fromDate and toDate are required when periodKey is omitted",
      code: "INVALID_SCOPE",
    })
  })

  it("maps ReconciliationSnapshotError NOT_FOUND to 404", async () => {
    const res = financeErrorResponse(
      new ReconciliationSnapshotError(
        "Reconciliation snapshot not found: snap-missing",
        "NOT_FOUND"
      ),
      "test"
    )
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      error: "Reconciliation snapshot not found: snap-missing",
      code: "NOT_FOUND",
    })
  })

  it("maps unknown errors to 500 JSON", async () => {
    const res = financeErrorResponse(new Error("boom"), "test-label")
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: "boom" })
  })
})
