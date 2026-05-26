import { AccountingPeriodStatus } from "@/generated/prisma/client"
import {
  financeErrorResponse,
  parseAccountingPeriodStatus,
} from "@/app/api/finance/shared/finance-api-errors"
import { ClosePolicyError } from "@/lib/finance/close-policy"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { ReconciliationError } from "@/lib/finance/reconciliation-errors"
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

  it("maps unknown errors to 500 JSON", async () => {
    const res = financeErrorResponse(new Error("boom"), "test-label")
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: "boom" })
  })
})
