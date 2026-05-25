import { AccountingPeriodStatus } from "@/generated/prisma/client"
import {
  financeErrorResponse,
  parseAccountingPeriodStatus,
} from "@/app/api/finance/shared/finance-api-errors"
import { ClosePolicyError } from "@/lib/finance/close-policy"
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

  it("maps unknown errors to 500 JSON", async () => {
    const res = financeErrorResponse(new Error("boom"), "test-label")
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: "boom" })
  })
})
