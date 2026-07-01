import { renderToStaticMarkup } from "react-dom/server"
import { GeneralLedgerTAccountView } from "@/components/finance/GeneralLedgerTAccountView"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import type { GeneralLedgerAccount } from "@/lib/finance-ui/types"

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const sampleAccount: GeneralLedgerAccount = {
  accountCode: "1",
  accountName: "ทุนหุ้นสามัญ",
  accountType: "EQUITY",
  openingDebit: "0",
  openingCredit: "0",
  openingBalance: "0",
  closingBalance: "2000000.00",
  transactions: [
    {
      journalEntryId: "je-1",
      journalLineId: "jl-1",
      journalDate: "2025-12-31T00:00:00.000Z",
      entryNo: "V-2025-12-00001",
      sourceRef: "MJV-260001",
      sourceRefType: FINANCE_REF_TYPES.MANUAL_JOURNAL,
      sourceRefId: "mje-1",
      voucherId: "voucher-je-1",
      description: "Opening balance entry",
      lineMemo: null,
      debit: "0",
      credit: "2000000.00",
      signedMovement: "-2000000",
      runningBalance: "2000000.00",
    },
  ],
}

describe("GeneralLedgerTAccountView", () => {
  it("renders debit and credit sides with date, ref, and amount only", () => {
    const html = renderToStaticMarkup(
      <GeneralLedgerTAccountView
        account={sampleAccount}
        returnTo="/finance/reports/general-ledger"
      />
    )

    expect(html).toContain('data-testid="gl-t-account-view"')
    expect(html).toContain('class="general-ledger-t-account-columns"')
    expect(html).toContain('data-testid="gl-t-account-debit"')
    expect(html).toContain('class="general-ledger-t-account-side general-ledger-t-account-side-debit"')
    expect(html).toContain('class="general-ledger-t-account-side general-ledger-t-account-side-credit"')
    expect(html).toContain("general-ledger-t-account-heading")
    expect(html).toContain('data-testid="gl-t-account-credit"')
    expect(html).toContain("1")
    expect(html).toContain("ทุนหุ้นสามัญ")
    expect(html).toContain("(EQUITY)")
    expect(html).toContain("Debit")
    expect(html).toContain("Credit")
    expect(html).toContain("31.12.2025")
    expect(html).toContain("MJV-260001")
    expect(html).not.toContain("V-2025-12-00001")
    expect(html).not.toContain("Opening balance entry")
    expect(html).not.toContain(">Description<")
    expect(html).toContain('href="/finance/manual-journal-entries/mje-1')
    expect(html).toContain("2,000,000.00")
  })

  it("shows balances and empty-state message when there are no transactions", () => {
    const emptyAccount: GeneralLedgerAccount = {
      ...sampleAccount,
      transactions: [],
      openingBalance: "100.00",
      closingBalance: "100.00",
    }

    const html = renderToStaticMarkup(
      <GeneralLedgerTAccountView
        account={emptyAccount}
        returnTo="/finance/reports/general-ledger"
      />
    )

    expect(html).toContain('data-testid="gl-t-account-empty"')
    expect(html).toContain("No period transactions.")
    expect(html).toContain('data-testid="gl-t-account-closing-balance"')
    expect(html).toContain("100.00")
  })
})
