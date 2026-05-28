import path from "path"
import { scanForbiddenPatterns } from "../../../scripts/audit/lib/scan"
import {
  GL_WRITER_JOURNAL_CREATE,
  GL_WRITER_VOUCHER_CREATE,
  VOUCHER_JOURNAL_CALLER_ALLOWLIST,
  auditPostingGateRequired,
  runPostingLockAudits,
} from "../../../scripts/audit/lib/rules"

const REPO_ROOT = path.join(__dirname, "..", "..", "..")

function expectAllPassed(results: ReturnType<typeof runPostingLockAudits>) {
  for (const result of results) {
    if (!result.passed) {
      const detail = result.violations
        .map((v) => `${v.ruleId} @ ${v.file}:${v.line ?? "?"}`)
        .join("\n")
      throw new Error(`${result.name} failed:\n${detail}`)
    }
  }
}

describe("posting lock audit rules", () => {
  it("passes on clean repo", () => {
    const results = runPostingLockAudits(REPO_ROOT)
    expect(results).toHaveLength(4)
    expectAllPassed(results)
  })

  it("GL_WRITER_SINGLETON flags voucher.create outside lib/finance/voucher.ts", () => {
    const hits = scanForbiddenPatterns(
      "await tx.voucher.create({ data: {} })",
      GL_WRITER_VOUCHER_CREATE.pattern,
      GL_WRITER_VOUCHER_CREATE.id,
      "lib/bad-module.ts"
    )
    expect(hits).toHaveLength(1)
    expect(hits[0]?.ruleId).toBe("GL_WRITER_SINGLETON")
  })

  it("GL_WRITER_SINGLETON flags journalEntry.create outside lib/finance/journal.ts", () => {
    const hits = scanForbiddenPatterns(
      "await tx.journalEntry.create({ data: {} })",
      GL_WRITER_JOURNAL_CREATE.pattern,
      GL_WRITER_JOURNAL_CREATE.id,
      "lib/bad-module.ts"
    )
    expect(hits).toHaveLength(1)
    expect(hits[0]?.ruleId).toBe("GL_WRITER_SINGLETON")
  })

  it("VOUCHER_JOURNAL_CALLER_ALLOWLIST flags direct low-level writer calls", () => {
    const hits = scanForbiddenPatterns(
      "await createVoucherWithLines(tx, input)",
      VOUCHER_JOURNAL_CALLER_ALLOWLIST.pattern,
      VOUCHER_JOURNAL_CALLER_ALLOWLIST.id,
      "lib/bad-module.ts"
    )
    expect(hits).toHaveLength(1)
    expect(hits[0]?.ruleId).toBe("VOUCHER_JOURNAL_CALLER_ALLOWLIST")
  })

  it("POSTING_GATE_REQUIRED passes when posting.ts gates before voucher creation", () => {
    const result = auditPostingGateRequired(REPO_ROOT)
    expect(result.passed).toBe(true)
    expect(result.violations).toHaveLength(0)
  })
})