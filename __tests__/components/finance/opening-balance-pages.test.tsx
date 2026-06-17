import { renderToStaticMarkup } from "react-dom/server"
import OpeningBalancePage from "@/app/(main)/finance/opening-balance/page"
import { OpeningBalanceHubPage } from "@/components/finance/OpeningBalanceHubPage"
import { OpeningBalancePostingVerificationPanel } from "@/components/finance/OpeningBalancePostingVerificationPanel"
import { ManualJournalEntryEditorPage } from "@/components/finance/ManualJournalEntryEditorPage"

jest.mock("@/components/main/EntityContextPageHeading", () => ({
  EntityContextPageHeading: ({ title }: { title: string }) => (
    <h1 data-testid="entity-context-page-title">{title}</h1>
  ),
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock("@/lib/finance-ui/opening-balance", () => ({
  fetchOpeningBalanceEntries: jest.fn().mockResolvedValue({
    entries: [
      {
        id: "opb-1",
        entryNo: "OPB-260001",
        entryType: "OPENING_BALANCE",
        status: "POSTED",
        branchId: "branch-1",
        legalEntityCode: "AS",
        entryDate: "2026-01-01T00:00:00.000Z",
        description: "Go-live OPB",
        refNo: null,
        createdByStaffId: "staff-1",
        submittedAt: null,
        submittedByStaffId: null,
        confirmedAt: null,
        confirmedByStaffId: null,
        postedAt: "2026-06-14T12:00:00.000Z",
        postedByStaffId: "staff-1",
        cancelledAt: null,
        cancelledByStaffId: null,
        cancelReason: null,
        postedVoucherId: "voucher-1",
        postedJournalEntryId: "journal-1",
        reversalJournalEntryId: null,
        createdAt: "2026-06-14T12:00:00.000Z",
        updatedAt: "2026-06-14T12:00:00.000Z",
        lineCount: 26,
      },
    ],
    total: 1,
  }),
  fetchOpeningBalancePostingVerification: jest.fn().mockResolvedValue({
    entryId: "opb-1",
    entryNo: "OPB-260001",
    entryType: "OPENING_BALANCE",
    status: "POSTED",
    branchId: "branch-1",
    legalEntityCode: "AS",
    entryDate: "2026-01-01T00:00:00.000Z",
    periodKey: "2026-01",
    entryTotalDebit: "5010280.88",
    entryTotalCredit: "5010280.88",
    postedJournalEntryId: "journal-1",
    postedVoucherId: "voucher-1",
    journalTotalDebit: "5010280.88",
    journalTotalCredit: "5010280.88",
    totalsMatch: true,
    trialBalanceBalanced: true,
    trialBalanceTotalDebit: "5010280.88",
    trialBalanceTotalCredit: "5010280.88",
    accountChecks: [
      {
        accountCode: "301",
        accountName: "Retained earnings",
        entryDebit: "0",
        entryCredit: "1936769.07",
        closingBalance: "1936769.07",
        sourceRefMatches: true,
      },
    ],
  }),
}))

jest.mock("@/lib/finance-ui/manual-journal-entry-session", () => ({
  fetchManualJournalSessionContext: jest.fn().mockResolvedValue({
    staffId: "staff-1",
    branchId: "branch-1",
    branchCode: "HO999",
    branchName: "Head Office",
    documentEntityCode: "AS",
  }),
}))

jest.mock("@/lib/finance-ui/gl-accounts", () => ({
  fetchGlAccounts: jest.fn().mockResolvedValue({
    view: "flat",
    accounts: [{ code: "1100", name: "Cash" }],
    total: 1,
  }),
}))

import type { ManualJournalEntryRead } from "@/lib/finance-ui/manual-journal-entries"

function asEntry(data: Record<string, unknown>): ManualJournalEntryRead {
  return data as ManualJournalEntryRead
}

describe("opening-balance pages", () => {
  it("wraps list page sections in a shared finance document container", () => {
    const html = renderToStaticMarkup(<OpeningBalancePage />)
    expect(html).toContain('data-testid="finance-document-container"')
    expect(html).toContain("Opening Balance")
    expect(html).toContain('data-testid="opening-balance-hub"')
    expect(html).toContain('data-testid="new-opening-balance"')
  })

  it("renders hub with OPB list and new shortcut", () => {
    const html = renderToStaticMarkup(<OpeningBalanceHubPage />)
    expect(html).toContain('data-testid="opening-balance-hub"')
    expect(html).toContain('data-testid="new-opening-balance"')
    expect(html).toContain("/finance/opening-balance/new")
    expect(html).toContain("Loading opening balances")
  })

  it("renders OPB editor mode banner on create", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="create"
        initialEntryType="OPENING_BALANCE"
        openingBalanceMode
      />
    )
    expect(html).toContain('data-testid="opb-mode-banner"')
    expect(html).toContain("balance-sheet accounts only")
    expect(html).not.toContain('data-testid="field-entry-type"')
  })

  it("renders posting verification panel for posted OPB", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        openingBalanceMode
        initialEntry={asEntry({
          id: "opb-1",
          entryNo: "OPB-260001",
          entryType: "OPENING_BALANCE",
          status: "POSTED",
          branchId: "branch-1",
          legalEntityCode: "AS",
          entryDate: "2026-01-01T00:00:00.000Z",
          description: "Go-live",
          refNo: null,
          createdByStaffId: "staff-1",
          submittedAt: "2026-06-14T12:00:00.000Z",
          submittedByStaffId: "staff-1",
          confirmedAt: "2026-06-14T12:00:00.000Z",
          confirmedByStaffId: "staff-1",
          postedAt: "2026-06-14T12:00:00.000Z",
          postedByStaffId: "staff-1",
          cancelledAt: null,
          cancelledByStaffId: null,
          cancelReason: null,
          postedVoucherId: "voucher-1",
          postedJournalEntryId: "journal-1",
          reversalJournalEntryId: null,
          createdAt: "2026-06-14T12:00:00.000Z",
          updatedAt: "2026-06-14T12:00:00.000Z",
          lines: [
            {
              id: "line-1",
              lineNo: 1,
              glAccountId: "acc-1",
              accountCode: "301",
              accountName: "Retained earnings",
              debit: "0",
              credit: "100",
              memo: null,
            },
            {
              id: "line-2",
              lineNo: 2,
              glAccountId: "acc-2",
              accountCode: "1100",
              accountName: "Cash",
              debit: "100",
              credit: "0",
              memo: null,
            },
          ],
        })}
      />
    )
    expect(html).toContain('data-testid="opb-verification-loading"')
  })

  it("renders verification panel standalone", () => {
    const html = renderToStaticMarkup(
      <OpeningBalancePostingVerificationPanel
        entryId="opb-1"
        entryNo="OPB-260001"
        postedJournalEntryId="journal-1"
      />
    )
    expect(html).toContain('data-testid="opb-verification-loading"')
  })

  it("right-aligns OPB line amounts, blanks zero sides, and shows footer totals", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        openingBalanceMode
        initialEntry={asEntry({
          id: "opb-1",
          entryNo: "OPB-260001",
          entryType: "OPENING_BALANCE",
          status: "CONFIRMED",
          branchId: "branch-1",
          legalEntityCode: "AS",
          entryDate: "2026-01-01T00:00:00.000Z",
          description: "Go-live",
          refNo: null,
          createdByStaffId: "staff-1",
          submittedAt: "2026-06-14T12:00:00.000Z",
          submittedByStaffId: "staff-1",
          confirmedAt: "2026-06-14T12:00:00.000Z",
          confirmedByStaffId: "staff-1",
          postedAt: null,
          postedByStaffId: null,
          cancelledAt: null,
          cancelledByStaffId: null,
          cancelReason: null,
          postedVoucherId: null,
          postedJournalEntryId: null,
          reversalJournalEntryId: null,
          createdAt: "2026-06-14T12:00:00.000Z",
          updatedAt: "2026-06-14T12:00:00.000Z",
          lines: [
            {
              id: "line-1",
              lineNo: 1,
              glAccountId: "acc-1",
              accountCode: "1100",
              accountName: "Cash",
              debit: "1000",
              credit: "0",
              memo: null,
            },
            {
              id: "line-2",
              lineNo: 2,
              glAccountId: "acc-2",
              accountCode: "301",
              accountName: "Retained earnings",
              debit: "0",
              credit: "1000",
              memo: null,
            },
          ],
        })}
      />
    )

    expect(html).toContain('data-testid="opb-confirmed-document-header"')
    expect(html).toContain('data-testid="finance-document-audit-line"')
    expect(html).toContain("finance-audit-line")
    expect(html).toContain("finance-table")
    expect(html).toContain("OPB-260001")
    expect(html).toContain("Entry Date: 01.01.2026")
    expect(html).toContain("Created: 14.06.2026")
    expect(html).toContain("Submitted: 14.06.2026")
    expect(html).toContain("Confirmed: 14.06.2026")
    expect(html).toContain('data-testid="finance-document-description"')
    expect(html).toContain("Description:")
    expect(html).toContain("Go-live")
    expect(html).not.toContain('data-testid="read-only-notice"')
    expect(html).not.toContain('data-testid="opb-mode-banner"')
    expect(html).not.toContain('data-testid="field-branch-id"')
    expect(html).not.toContain('data-testid="field-entry-date"')
    expect(html).not.toContain('data-testid="field-ref-no"')
    expect(html).not.toContain("manual-journal-entry-status-badge")
    expect(html).not.toContain("OPB — Opening balance")
    expect(html).toContain("finance-number")
    expect(html).toContain('data-testid="line-total-debit"')
    expect(html).toContain('data-testid="line-total-credit"')
    expect(html).toContain('data-testid="line-total-difference"')
    expect(html).toContain("Total Debit")
    expect(html).toContain("Total Credit")
    expect(html).toContain("Difference")
    expect(html).toMatch(/1,000\.00|1000\.00/)
    expect(html).toContain('class="finance-number numeric-cell px-2 py-1">')
    expect(html).not.toMatch(/<span class="[^"]*finance-number[^"]*">/)
    expect(html).not.toMatch(
      /<td class="[^"]*finance-number[^"]*">0\.00<\/td>/
    )
    expect(html).toContain("finance-diff-balanced")
    expect(html).toContain('data-testid="action-post"')
  })

  it("shows red difference footer when OPB entry is unbalanced", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        openingBalanceMode
        initialEntry={asEntry({
          id: "opb-2",
          entryNo: "OPB-260002",
          entryType: "OPENING_BALANCE",
          status: "DRAFT",
          branchId: "branch-1",
          legalEntityCode: "AS",
          entryDate: "2026-01-01T00:00:00.000Z",
          description: null,
          refNo: null,
          createdByStaffId: "staff-1",
          submittedAt: null,
          submittedByStaffId: null,
          confirmedAt: null,
          confirmedByStaffId: null,
          postedAt: null,
          postedByStaffId: null,
          cancelledAt: null,
          cancelledByStaffId: null,
          cancelReason: null,
          postedVoucherId: null,
          postedJournalEntryId: null,
          reversalJournalEntryId: null,
          createdAt: "2026-06-14T12:00:00.000Z",
          updatedAt: "2026-06-14T12:00:00.000Z",
          lines: [
            {
              id: "line-1",
              lineNo: 1,
              glAccountId: "acc-1",
              accountCode: "1100",
              accountName: "Cash",
              debit: "1000",
              credit: "0",
              memo: null,
            },
            {
              id: "line-2",
              lineNo: 2,
              glAccountId: "acc-2",
              accountCode: "301",
              accountName: "Retained earnings",
              debit: "0",
              credit: "500",
              memo: null,
            },
          ],
        })}
      />
    )

    expect(html).toContain('data-testid="line-total-difference"')
    expect(html).toContain("finance-diff-unbalanced")
    expect(html).toMatch(/500\.00/)
  })
})
