import { renderToStaticMarkup } from "react-dom/server"
import { OpeningBalanceHubPage } from "@/components/finance/OpeningBalanceHubPage"
import { OpeningBalancePostingVerificationPanel } from "@/components/finance/OpeningBalancePostingVerificationPanel"
import { ManualJournalEntryEditorPage } from "@/components/finance/ManualJournalEntryEditorPage"

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
})
