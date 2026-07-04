/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { BankStatementQuickPanel } from "@/components/finance/bank-cash/BankStatementQuickPanel"
import type { BankStatementDetail } from "@/lib/finance/bank-statement/bank-statement-types"
import { matchStatementLinesToJournal } from "@/lib/finance/bank-statement-match"
import { quickLinesToMatchLines, type QuickStatementLine } from "@/lib/finance-ui/bank-cash-workspace"

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    title,
    "data-testid": testId,
  }: {
    children: React.ReactNode
    title?: string
    "data-testid"?: string
  }) => (
    <a data-testid={testId} title={title}>
      {children}
    </a>
  ),
}))

jest.mock("@/lib/finance-ui/use-finance-legal-entity-scope", () => ({
  useFinanceEntityPathBuilder: () => (path: string) => `${path}?legalEntityCode=AD`,
}))

jest.mock("@/lib/finance-ui/general-ledger-display", () => ({
  buildGeneralLedgerRefPath: () => "/finance/vouchers/mjv-001",
}))

const detail: BankStatementDetail = {
  id: "stmt-1",
  legalEntityCode: "AD",
  bankAccountId: "bank-1",
  bankAccount: {
    id: "bank-1",
    bankName: "BBL",
    accountNumber: "123",
    accountName: "Operating",
    currencyCode: "THB",
    glAccount: { id: "gl-1", code: "1100", name: "Bank" },
  },
  periodKey: "2026-01",
  statementNo: "BS-2026-01-001",
  statementDate: "2026-01-31",
  openingBalance: "1000.00",
  closingBalance: "1500.00",
  status: "DRAFT",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdByStaffId: null,
  updatedByStaffId: null,
  lines: [],
  validation: {
    isValid: true,
    openingBalance: "1000.00",
    totalDeposits: "0.00",
    totalWithdrawals: "0.00",
    computedClosingBalance: "1000.00",
    declaredClosingBalance: "1500.00",
    message: "ok",
  },
}

const matchedJournalLines = {
  "j-1": {
    journalLineId: "j-1",
    journalEntryId: "je-1",
    entryNo: "MJV-001",
    sourceRef: null,
    sourceRefType: null,
  },
}

const defaultCompletionProps = {
  completingCheck: false,
  canCompleteCheck: false,
  onCompleteCheck: jest.fn(),
}

function renderPanel(
  props: Partial<React.ComponentProps<typeof BankStatementQuickPanel>> & {
    lines: QuickStatementLine[]
    matchSummary: ReturnType<typeof matchStatementLinesToJournal>
  }
) {
  return renderToStaticMarkup(
    <BankStatementQuickPanel
      detail={detail}
      matchedJournalLines={matchedJournalLines}
      returnTo="/finance/bank-cash"
      readOnly={false}
      saving={false}
      error={null}
      onLinesChange={jest.fn()}
      onSave={jest.fn()}
      onAddLine={jest.fn()}
      {...defaultCompletionProps}
      {...props}
    />
  )
}

describe("BankStatementQuickPanel", () => {
  it("shows match summary on the heading row before statement identity", () => {
    const lines: QuickStatementLine[] = [
      {
        key: "line-1",
        depositAmount: "250.00",
        withdrawalAmount: "",
        transactionDate: "",
        description: "",
        chequeNumber: "",
        showDetails: false,
      },
    ]
    const matchSummary = matchStatementLinesToJournal(
      quickLinesToMatchLines(lines),
      [{ id: "j-1", depositAmount: "250.00", withdrawalAmount: "0.00" }]
    )

    const html = renderPanel({
      lines,
      matchSummary,
      detail: {
        id: "stmt-1",
        legalEntityCode: "AD",
        bankAccountId: "bank-1",
        bankAccount: {
          id: "bank-1",
          bankName: "BBL",
          accountNumber: "123",
          accountName: "Operating",
          currencyCode: "THB",
          glAccount: { id: "gl-1", code: "1100", name: "Bank" },
        },
        periodKey: "2026-01",
        statementNo: "BS-2026-01-001",
        statementDate: "2026-01-31",
        openingBalance: "1000.00",
        closingBalance: "1500.00",
        status: "READY",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        createdByStaffId: null,
        updatedByStaffId: null,
        lines: [],
        validation: {
          isValid: true,
          openingBalance: "1000.00",
          totalDeposits: "0.00",
          totalWithdrawals: "0.00",
          computedClosingBalance: "1000.00",
          declaredClosingBalance: "1500.00",
          message: "ok",
        },
      },
    })

    expect(html).toContain("🟢 1 matched")
    expect(html).toContain("🟠 0 unmatched")
    expect(html.indexOf('data-testid="bank-statement-match-summary"')).toBeLessThan(
      html.indexOf('data-testid="bank-statement-workspace-ref"')
    )
    expect(html).toContain("BS-2026-01-001 · READY")
  })

  it("shows green open action for matched amount-only rows", () => {
    const lines: QuickStatementLine[] = [
      {
        key: "line-1",
        serverId: "line-1",
        depositAmount: "250.00",
        withdrawalAmount: "",
        transactionDate: "",
        description: "",
        chequeNumber: "",
        showDetails: false,
      },
    ]
    const matchSummary = matchStatementLinesToJournal(
      quickLinesToMatchLines(lines),
      [{ id: "j-1", depositAmount: "250.00", withdrawalAmount: "0.00" }]
    )

    const html = renderPanel({ lines, matchSummary })
    expect(html).toContain('data-testid="statement-match-open-line-1"')
    expect(html).not.toContain('data-testid="statement-match-indicator-line-1"')
  })

  it("shows warning icon for unmatched amount rows", () => {
    const lines: QuickStatementLine[] = [
      {
        key: "line-2",
        depositAmount: "",
        withdrawalAmount: "999.00",
        transactionDate: "",
        description: "",
        chequeNumber: "",
        showDetails: false,
      },
    ]
    const matchSummary = matchStatementLinesToJournal(
      quickLinesToMatchLines(lines),
      [{ id: "j-1", depositAmount: "250.00", withdrawalAmount: "0.00" }]
    )

    const html = renderPanel({ lines, matchSummary })
    expect(html).toContain('data-testid="statement-match-indicator-line-2"')
    expect(html).toContain('aria-label="No matching journal entry found."')
    expect(html).not.toContain("investigate")
    expect(html).not.toContain('data-testid="statement-match-open-line-2"')
  })

  it("renders amount columns without detail fields", () => {
    const lines: QuickStatementLine[] = [
      {
        key: "line-1",
        depositAmount: "100.00",
        withdrawalAmount: "",
        transactionDate: "",
        description: "",
        chequeNumber: "",
        showDetails: false,
      },
    ]

    const html = renderPanel({
      lines,
      matchSummary: {
        matches: [],
        groups: [],
        matchedStatementLineIds: [],
        matchedJournalLineIds: [],
        unmatchedStatementLineIds: ["line-1"],
        unmatchedJournalLineIds: [],
      },
      matchedJournalLines: {},
      onAddLine: jest.fn(),
    })

    expect(html).toContain('data-testid="statement-deposit-line-1"')
    expect(html).not.toContain("Details")
    expect(html).not.toContain('type="date"')
  })

  it("shows grouped match tooltip for multi-statement matches", () => {
    const lines: QuickStatementLine[] = [
      {
        key: "line-1",
        serverId: "line-1",
        depositAmount: "",
        withdrawalAmount: "166250.00",
        transactionDate: "",
        description: "",
        chequeNumber: "",
        showDetails: false,
      },
      {
        key: "line-2",
        serverId: "line-2",
        depositAmount: "",
        withdrawalAmount: "20.00",
        transactionDate: "",
        description: "",
        chequeNumber: "",
        showDetails: false,
      },
    ]
    const matchSummary = matchStatementLinesToJournal(
      quickLinesToMatchLines(lines),
      [{ id: "j-pav", depositAmount: "0.00", withdrawalAmount: "166270.00" }]
    )

    const html = renderPanel({
      lines,
      matchSummary,
      matchedJournalLines: {
        "j-pav": {
          journalLineId: "j-pav",
          journalEntryId: "je-1",
          entryNo: "PAV-260001",
          sourceRef: null,
          sourceRefType: null,
        },
      },
      onAddLine: jest.fn(),
    })

    expect(html).toContain('data-testid="statement-match-open-line-1"')
    expect(html).toContain('data-testid="statement-match-open-line-2"')
    expect(html).toContain("Grouped match: 166,250.00 + 20.00 = PAV-260001 166,270.00")
  })

  it("disables Complete Check when unmatched rows remain", () => {
    const lines: QuickStatementLine[] = [
      {
        key: "line-1",
        depositAmount: "100.00",
        withdrawalAmount: "",
        transactionDate: "",
        description: "",
        chequeNumber: "",
        showDetails: false,
      },
    ]
    const matchSummary = matchStatementLinesToJournal(
      quickLinesToMatchLines(lines),
      [{ id: "j-1", depositAmount: "250.00", withdrawalAmount: "0.00" }]
    )

    const html = renderPanel({
      lines,
      matchSummary,
      canCompleteCheck: false,
      onAddLine: jest.fn(),
    })

    expect(html).toContain('data-testid="bank-statement-complete-check"')
    expect(html).toContain("disabled")
    expect(html).toContain("Resolve unmatched statement amounts before completing.")
  })

  it("enables Complete Check when all amount rows are matched", () => {
    const lines: QuickStatementLine[] = [
      {
        key: "line-1",
        depositAmount: "250.00",
        withdrawalAmount: "",
        transactionDate: "",
        description: "",
        chequeNumber: "",
        showDetails: false,
      },
    ]
    const matchSummary = matchStatementLinesToJournal(
      quickLinesToMatchLines(lines),
      [{ id: "j-1", depositAmount: "250.00", withdrawalAmount: "0.00" }]
    )

    const html = renderPanel({
      lines,
      matchSummary,
      canCompleteCheck: true,
      onAddLine: jest.fn(),
    })

    expect(html).toContain('data-testid="bank-statement-complete-check"')
    expect(html).toContain("Complete Check")
    expect(html).not.toMatch(/data-testid="bank-statement-complete-check"[^>]*disabled/)
  })
})
