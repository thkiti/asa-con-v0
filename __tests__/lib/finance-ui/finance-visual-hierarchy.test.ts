import fs from "fs"
import path from "path"

describe("finance visual hierarchy tokens", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8")

  it("defines priority-level finance color tokens for light and dark", () => {
    for (const token of [
      "--finance-amount",
      "--finance-account-name",
      "--finance-header",
      "--finance-account-code",
      "--finance-memo",
      "--finance-description",
      "--finance-audit",
    ]) {
      expect(css).toContain(token)
    }
  })

  it("styles amounts stronger than account names and audit metadata", () => {
    expect(css).toMatch(/\.finance-table \.finance-number[\s\S]*font-weight: 600/)
    expect(css).toMatch(/span\.finance-account[\s\S]*font-weight: 400/)
    expect(css).toContain("--finance-account-code-width: 8ch")
    expect(css).toMatch(/span\.finance-account \.finance-account-code-part[\s\S]*text-align: right/)
    expect(css).toMatch(
      /span\.finance-account \.finance-account-code-part[\s\S]*font-variant-numeric: tabular-nums/
    )
    expect(css).toMatch(/\.finance-report-table thead th[\s\S]*position: sticky/)
    expect(css).toMatch(/\.finance-report-table thead th[\s\S]*top: 0/)
    expect(css).toMatch(/\.finance-report-table thead th[\s\S]*background-color: var\(--background\)/)
    expect(css).toMatch(/\.finance-table td\.finance-number[\s\S]*text-align: right/)
    expect(css).toMatch(/span\.finance-account \.finance-account-separator[\s\S]*white-space: pre/)
    expect(css).toMatch(/\.finance-table td\.finance-number input[\s\S]*width: 100%/)
    expect(css).toMatch(/\.finance-audit-line[\s\S]*font-weight: 400/)
    expect(css).toMatch(/\.finance-table \.finance-total-value[\s\S]*font-weight: 700/)
  })
})
