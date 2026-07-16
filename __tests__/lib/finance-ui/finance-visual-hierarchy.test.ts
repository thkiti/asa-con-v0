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
    expect(css).toMatch(
      /\.finance-account-display[\s\S]*display: inline-grid/
    )
    expect(css).toMatch(
      /\.finance-account-code[\s\S]*font-variant-numeric: tabular-nums/
    )
    expect(css).toMatch(/\.finance-report-table thead th[\s\S]*position: sticky/)
    expect(css).toMatch(/\.finance-report-table thead th[\s\S]*top: 0/)
    expect(css).toMatch(/\.finance-report-table thead th[\s\S]*background-color: var\(--background\)/)
    expect(css).toMatch(/\.finance-table td\.finance-number[\s\S]*text-align: right/)
    expect(css).toMatch(
      /\.trial-balance-report \.finance-account-code[\s\S]*text-align: left/
    )
    expect(css).toMatch(/\.finance-account-separator[\s\S]*opacity: 0\.8/)
    expect(css).toMatch(
      /\.account-combobox-dropdown[\s\S]*width: min\(600px, calc\(100vw - 3rem\)\)/
    )
    expect(css).toMatch(
      /\.account-combobox-dropdown[\s\S]*max-width: min\(600px, calc\(100vw - 3rem\)\)/
    )
    expect(css).not.toMatch(/\.account-combobox-dropdown[\s\S]*760px/)
    expect(css).toMatch(/\.account-combobox-dropdown[\s\S]*scrollbar-width: thin/)
    expect(css).toMatch(
      /\.account-combobox-dropdown::-webkit-scrollbar[\s\S]*width: 8px/
    )
    expect(css).toMatch(
      /\.account-combobox-dropdown::-webkit-scrollbar-thumb[\s\S]*border-radius: 999px/
    )
    expect(css).toMatch(
      /\.finance-account-option[\s\S]*display: grid/
    )
    expect(css).toMatch(
      /\.finance-account-option[\s\S]*grid-template-columns: var\(--finance-account-code-width\) minmax\(0, 1fr\)/
    )
    expect(css).toMatch(
      /\.finance-account-option-code[\s\S]*text-align: left/
    )
    expect(css).toMatch(
      /\.finance-account-option-code[\s\S]*font-variant-numeric: tabular-nums/
    )
    expect(css).toMatch(
      /\.finance-account-option-name[\s\S]*white-space: normal/
    )
    expect(css).toMatch(
      /\.general-ledger-t-account-columns[\s\S]*display: flex/
    )
    expect(css).toMatch(
      /\.general-ledger-t-account-columns[\s\S]*justify-content: space-between/
    )
    expect(css).toMatch(
      /\.general-ledger-t-account-side-credit \.general-ledger-t-account-heading[\s\S]*text-align: right/
    )
    expect(css).toMatch(
      /\.general-ledger-t-account-side-debit \.general-ledger-t-account-heading[\s\S]*text-align: left/
    )
    expect(css).toMatch(/\.finance-table td\.finance-number input[\s\S]*width: 100%/)
    expect(css).toMatch(/\.finance-audit-line[\s\S]*font-weight: 400/)
    expect(css).toMatch(/\.finance-table \.finance-total-value[\s\S]*font-weight: 700/)
  })
})
