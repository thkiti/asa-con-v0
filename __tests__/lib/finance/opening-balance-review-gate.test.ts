import {
  assertOpeningBalanceReviewReady,
  openingBalanceReviewToCloseChecklist,
} from "@/lib/finance/opening-balance-review-gate"
import type { OpeningBalanceReviewResult } from "@/lib/finance/opening-balance-review-types"

function sampleReview(status: "READY" | "BLOCKED"): OpeningBalanceReviewResult {
  return {
    status,
    blockerCount: status === "READY" ? 0 : 1,
    items: [
      {
        id: "ob-journal-posted",
        passed: status === "READY",
        title: "Opening Balance journal is POSTED",
        detail: "detail",
      },
    ],
    period: {
      id: "period-1",
      legalEntityCode: "AS",
      branchId: "branch-1",
      periodKey: "2025-12",
      status: "OPEN",
      closedAt: null,
    },
    openingJournal: {
      id: "opb-1",
      entryNo: "OPB-260001",
      status: status === "READY" ? "POSTED" : "DRAFT",
      postedAt: null,
      postedJournalEntryId: null,
      postedVoucherId: null,
      voucherNo: null,
    },
    trialBalance: {
      isBalanced: status === "READY",
      totalDebit: "100.00",
      totalCredit: "100.00",
    },
  }
}

describe("opening balance review gate", () => {
  it("passes when review is READY", () => {
    expect(() => assertOpeningBalanceReviewReady(sampleReview("READY"))).not.toThrow()
  })

  it("blocks when review is BLOCKED", () => {
    expect(() => assertOpeningBalanceReviewReady(sampleReview("BLOCKED"))).toThrow(
      /Opening balance review blocked/
    )
  })

  it("maps review items into close checklist evidence shape", () => {
    const checklist = openingBalanceReviewToCloseChecklist(sampleReview("READY"))
    expect(checklist.status).toBe("READY")
    expect(checklist.items[0]?.severity).toBe("PASS")
    expect(checklist.latestSnapshotRef).toBeNull()
  })
})
