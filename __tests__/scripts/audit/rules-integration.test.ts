import path from "path"
import {
  runArchitectureAudits,
  runFinanceBoundaryAudits,
  runNestedTxAudits,
  runUiBoundaryAudits,
} from "../../../scripts/audit/lib/rules"

const REPO_ROOT = path.join(__dirname, "..", "..", "..")

function expectAllPassed(results: ReturnType<typeof runArchitectureAudits>) {
  for (const result of results) {
    if (!result.passed) {
      const detail = result.violations
        .map((v) => `${v.ruleId} @ ${v.file}:${v.line ?? "?"}`)
        .join("\n")
      throw new Error(`${result.name} failed:\n${detail}`)
    }
  }
}

describe("architecture audit rules integration", () => {
  it("finance boundary audits pass on clean repo", () => {
    const results = runFinanceBoundaryAudits(REPO_ROOT)
    expect(results.length).toBeGreaterThan(0)
    expectAllPassed(results)
  })

  it("UI boundary audits pass on clean repo", () => {
    const results = runUiBoundaryAudits(REPO_ROOT)
    expect(results.length).toBeGreaterThan(0)
    expectAllPassed(results)
  })

  it("nested transaction audits pass on clean repo", () => {
    const results = runNestedTxAudits(REPO_ROOT)
    expect(results.length).toBeGreaterThan(0)
    expectAllPassed(results)
  })

  it("full architecture audit passes on clean repo", () => {
    const results = runArchitectureAudits(REPO_ROOT)
    expect(results.length).toBeGreaterThanOrEqual(8)
    expectAllPassed(results)
  })
})
