import { AccountingPeriodStatus } from "@/generated/prisma/client"
import {
  DEFAULT_REOPEN_APPROVAL_POLICY,
  getReopenApprovalPolicy,
  reopenApprovalRequired,
  STRICT_REOPEN_APPROVAL_POLICY,
} from "@/lib/finance/reopen-approval-policy"

describe("reopen-approval-policy", () => {
  it("HARD reopen always requires approval in default policy", () => {
    expect(reopenApprovalRequired(AccountingPeriodStatus.HARD_CLOSED)).toBe(true)
    expect(getReopenApprovalPolicy().hardReopenRequiresApproval).toBe(true)
  })

  it("SOFT reopen does not require approval by default", () => {
    expect(reopenApprovalRequired(AccountingPeriodStatus.SOFT_CLOSED)).toBe(false)
    expect(DEFAULT_REOPEN_APPROVAL_POLICY.softReopenRequiresApproval).toBe(false)
  })

  it("strict policy requires approval for SOFT reopen", () => {
    expect(
      reopenApprovalRequired(
        AccountingPeriodStatus.SOFT_CLOSED,
        STRICT_REOPEN_APPROVAL_POLICY
      )
    ).toBe(true)
  })

  it("OPEN never requires approval", () => {
    expect(reopenApprovalRequired(AccountingPeriodStatus.OPEN)).toBe(false)
  })
})
