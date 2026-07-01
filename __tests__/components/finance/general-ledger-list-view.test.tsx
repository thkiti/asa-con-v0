import { renderToStaticMarkup } from "react-dom/server"
import { GeneralLedgerListView } from "@/components/finance/GeneralLedgerListView"
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
  accountCode: "6003",
  accountName: "ต้นทุนขาย-วัสดุรองเท้า",
  accountType: "EXPENSE",
  openingDebit: "0",
  openingCredit: "0",
  openingBalance: "0",
  closingBalance: "34323.08",
  transactions: [
    {
      journalEntryId: "je-1",
      journalLineId: "jl-1",
      journalDate: "2026-01-31T07:00:00.000Z",
      entryNo: "V-2026-01-00007",
      sourceRef: "MJV-260007",
      sourceRefType: FINANCE_REF_TYPES.MANUAL_JOURNAL,
      sourceRefId: "mje-7",
      voucherId: "voucher-je-1",
      description: "Purchase materials",
      lineMemo: null,
      debit: "34323.08",
      credit: "0",
      signedMovement: "34323.08",
      runningBalance: "34323.08",
    },
  ],
}

describe("GeneralLedgerListView", () => {
  it("renders date, ref, debit, credit, and running balance without description", () => {
    const html = renderToStaticMarkup(
      <GeneralLedgerListView
        account={sampleAccount}
        returnTo="/finance/reports/general-ledger"
      />
    )

    expect(html).toContain("31.01.2026")
    expect(html).not.toContain("Jan 31, 2026")
    expect(html).not.toContain("07:00")
    expect(html).toContain("MJV-260007")
    expect(html).not.toContain("V-2026-01-00007")
    expect(html).not.toContain("Purchase materials")
    expect(html).not.toContain(">Description<")
    expect(html).toContain("34,323.08")
    expect(html).toContain('href="/finance/manual-journal-entries/mje-7')
  })
})
