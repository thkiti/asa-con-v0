import { renderToStaticMarkup } from "react-dom/server"
import { ManualJournalEntryEditorPage } from "@/components/finance/ManualJournalEntryEditorPage"
import { ManualJournalEntryListPage } from "@/components/finance/ManualJournalEntryListPage"
import { MjvLineAccountInput } from "@/components/finance/MjvLineAccountInput"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock("@/lib/finance-ui/finance-voucher-local-font", () => ({
  financeVoucherLocalFont: {
    variable: "font-finance-voucher",
    className: "font-finance-voucher",
  },
}))

jest.mock("@/lib/finance-ui/use-finance-current-return-path", () => ({
  useFinanceCurrentReturnPath: () => "/finance/manual-journal-entries/entry-1",
}))

jest.mock("@/lib/finance-ui/manual-journal-entries", () => ({
  fetchManualJournalEntries: jest.fn().mockResolvedValue({
    entries: [
      {
        id: "entry-1",
        entryNo: "MJV-260001",
        entryType: "MANUAL",
        status: "DRAFT",
        branchId: "branch-1",
        branchCode: "HO999",
        branchName: "Head Office",
        legalEntityCode: "AS",
        entryDate: "2026-06-14T12:00:00.000Z",
        description: "Test",
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
        lineCount: 2,
      },
    ],
    total: 1,
  }),
  fetchManualJournalEntry: jest.fn(),
  createManualJournalEntryDraft: jest.fn(),
  updateManualJournalEntryDraft: jest.fn(),
  deleteDraftManualJournalEntry: jest.fn(),
  submitManualJournalEntry: jest.fn(),
  confirmManualJournalEntry: jest.fn(),
  cancelManualJournalEntry: jest.fn(),
  postManualJournalEntry: jest.fn(),
  buildManualJournalEntryPdfUrl: (entryId: string, disposition = "inline") =>
    `/api/finance/manual-journal-entries/${entryId}/pdf?disposition=${disposition}`,
}))

jest.mock("@/lib/finance-ui/manual-journal-entry-session", () => ({
  fetchManualJournalSessionContext: jest.fn().mockResolvedValue({
    staffId: "staff-1",
    branchId: "branch-1",
    branchCode: "HO999",
    branchName: "Head Office",
    documentEntityCode: "AS",
    role: "HO_FINANCE",
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

function baseEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-1",
    entryNo: "MJV-260001",
    entryType: "MANUAL",
    status: "DRAFT",
    branchId: "branch-1",
    branchCode: "HO999",
    branchName: "Head Office",
    legalEntityCode: "AS",
    entryDate: "2026-06-14T12:00:00.000Z",
    description: "Test entry",
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
    pdfPath: null,
    pdfBlobUrl: null,
    pdfGeneratedAt: null,
    pdfSnapshotReady: false,
    createdAt: "2026-06-14T12:00:00.000Z",
    updatedAt: "2026-06-14T12:00:00.000Z",
    lines: [
      {
        id: "line-1",
        lineNo: 1,
        glAccountId: "acc-1",
        accountCode: "1100",
        accountName: "Cash",
        debit: "100.00",
        credit: "0.00",
        memo: null,
      },
      {
        id: "line-2",
        lineNo: 2,
        glAccountId: "acc-2",
        accountCode: "5000",
        accountName: "Expense",
        debit: "0.00",
        credit: "100.00",
        memo: null,
      },
    ],
    ...overrides,
  }
}

describe("ManualJournalEntryListPage", () => {
  it("renders compact inquiry filters, actions above filters, and simplified table", () => {
    const html = renderToStaticMarkup(<ManualJournalEntryListPage />)
    expect(html).toContain('data-testid="manual-journal-entry-list"')
    expect(html).toContain('data-testid="manual-journal-entry-filter-period"')
    expect(html).toContain('data-testid="manual-journal-entry-more-filter"')
    expect(html).toContain('data-testid="filter-status"')
    expect(html).toContain('data-testid="filter-entry-type"')
    expect(html).toContain('data-testid="manual-journal-entry-filter-no"')
    expect(html).toContain('data-testid="manual-journal-entry-filter-post"')
    expect(html).toContain('data-testid="manual-journal-entry-search"')
    expect(html).toContain('data-testid="manual-journal-entry-clear"')
    expect(html).toContain('data-testid="new-manual-journal-entry"')
    expect(html).toContain('data-testid="manual-journal-entry-refresh"')
    expect(html).not.toContain('data-testid="filter-legal-entity"')
    expect(html).not.toContain("Legal entity")
    expect(html).not.toContain('data-testid="filter-date-from"')
    expect(html).not.toContain('data-testid="filter-date-to"')
    expect(html).not.toContain(">Type<")
    expect(html).not.toContain(">Entity<")
    expect(html).not.toContain("07:00 AM")
    expect(html.indexOf('data-testid="manual-journal-entry-actions"')).toBeLessThan(
      html.indexOf('data-testid="manual-journal-entry-filters"')
    )
    const periodIndex = html.indexOf('data-testid="manual-journal-entry-filter-period"')
    const moreIndex = html.indexOf('data-testid="manual-journal-entry-more-filter"')
    const noIndex = html.indexOf('data-testid="manual-journal-entry-filter-no"')
    const statusIndex = html.indexOf('data-testid="filter-status"')
    const entryTypeIndex = html.indexOf('data-testid="filter-entry-type"')
    const postIndex = html.indexOf('data-testid="manual-journal-entry-filter-post"')
    const searchIndex = html.indexOf('data-testid="manual-journal-entry-search"')
    const clearIndex = html.indexOf('data-testid="manual-journal-entry-clear"')
    expect(moreIndex).toBeGreaterThan(periodIndex)
    expect(noIndex).toBeGreaterThan(moreIndex)
    expect(statusIndex).toBeGreaterThan(noIndex)
    expect(entryTypeIndex).toBeGreaterThan(statusIndex)
    expect(postIndex).toBeGreaterThan(entryTypeIndex)
    expect(searchIndex).toBeGreaterThan(postIndex)
    expect(clearIndex).toBeGreaterThan(searchIndex)
    expect(html).toContain('placeholder="MJV-…"')
    expect(html).toContain("/finance/manual-journal-entries/new")
  })

  it("uses simplified table columns in list markup", () => {
    const fs = require("fs") as typeof import("fs")
    const path = require("path") as typeof import("path")
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/finance/ManualJournalEntryListPage.tsx"),
      "utf8"
    )
    expect(source).toContain(">Document no.<")
    expect(source).toContain(">Description<")
    expect(source).toContain(">Lines<")
    expect(source).toContain("formatFinanceListDate")
    expect(source).not.toContain("formatDateTime(row.entryDate)")
  })
})

describe("ManualJournalEntryEditorPage create", () => {
  it("renders compact meta row, line columns, and workflow below totals", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage mode="create" initialEntryType="MANUAL" />
    )
    expect(html).toContain('data-testid="manual-journal-entry-editor"')
    expect(html).toContain('data-testid="mjv-entry-shell"')
    expect(html).toContain('data-testid="mjv-entry-meta-row"')
    expect(html).not.toContain('data-testid="mjv-entry-sticky-header"')
    expect(html).toContain("Draft / Pending number")
    expect(html).toContain('data-testid="field-description"')
    expect(html).toContain('data-testid="field-entry-date"')
    expect(html).not.toContain('data-testid="field-branch-id"')
    expect(html).not.toContain('data-testid="field-entry-type"')
    expect(html).not.toContain('data-testid="field-ref-no"')
    expect(html).not.toContain('data-testid="manual-journal-document-no"')
    expect(html).not.toContain("Legal entity:")
    expect(html).not.toContain('data-testid="entity-context-page-title"')
    expect(html).toContain('data-testid="action-save"')
    expect(html).toContain('data-testid="action-submit"')
    expect(html).toContain('data-testid="action-back"')
    expect(html).toContain('data-testid="line-account-code"')
    expect(html).toContain('placeholder="Account No."')
    expect(html).not.toContain(">Name</th>")
    expect(html).toContain(">Account</th>")
    expect(html).toContain(">Debit</th>")
    expect(html).toContain(">Credit</th>")
    expect(html).toContain(">Memo</th>")
    expect(html).toContain('data-testid="line-debit"')
    expect(html).toContain('data-testid="line-credit"')
    expect(html).toContain('data-testid="line-memo"')
    expect(html).toContain('data-testid="line-remove"')
    expect(html).toContain("mjv-entry-lines-table")
    expect(html.indexOf('data-testid="mjv-entry-meta-row"')).toBeLessThan(
      html.indexOf('data-testid="manual-journal-lines-table"')
    )
    expect(html.indexOf('data-testid="mjv-entry-totals"')).toBeLessThan(
      html.indexOf('data-testid="workflow-actions"')
    )
    expect(html).toContain("<tfoot")
    expect(html).toContain(">Total</td>")
    expect(html).toContain('data-testid="line-total-debit"')
    expect(html).toContain('data-testid="line-total-credit"')
    expect(html).not.toContain("Debit total")
    expect(html).not.toContain("Credit total")
    expect(html).not.toContain(">Balance</")
    expect(html).not.toContain('data-testid="line-balance-status"')
    expect(html).not.toContain("Balanced")
    expect(html).not.toContain('data-testid="action-delete"')
  })
})

describe("ManualJournalEntryEditorPage edit by status", () => {
  it("renders DRAFT save, submit, delete buttons", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        entryId="entry-1"
        initialEntry={asEntry(baseEntry({ status: "DRAFT" }))}
      />
    )
    expect(html).toContain("MJV-260001")
    expect(html).toContain('data-testid="mjv-entry-meta-row"')
    expect(html).not.toContain('data-testid="mjv-entry-sticky-header"')
    expect(html).not.toContain('data-testid="field-branch-id"')
    expect(html).not.toContain('data-testid="field-entry-type"')
    expect(html).not.toContain(">Name</th>")
    expect(html).toContain("data-testid=\"action-save\"")
    expect(html).toContain("data-testid=\"action-submit\"")
    expect(html).toContain("data-testid=\"action-delete\"")
    expect(html).toContain("data-testid=\"line-account-code\"")
  })

  it("renders SUBMITTED confirm and cancel buttons read-only lines", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        entryId="entry-1"
        initialEntry={asEntry(
          baseEntry({
            status: "SUBMITTED",
            submittedAt: "2026-06-14T13:00:00.000Z",
          })
        )}
      />
    )
    expect(html).toContain("data-testid=\"action-confirm\"")
    expect(html).toContain("data-testid=\"action-cancel-open\"")
    expect(html).not.toContain("data-testid=\"action-save\"")
    expect(html).not.toContain("data-testid=\"line-account-code\"")
    expect(html).toContain("read-only")
  })

  it("renders CONFIRMED post and cancel buttons", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        entryId="entry-1"
        initialEntry={asEntry(
          baseEntry({
            status: "CONFIRMED",
            confirmedAt: "2026-06-14T14:00:00.000Z",
          })
        )}
      />
    )
    expect(html).toContain("data-testid=\"action-post\"")
    expect(html).toContain("data-testid=\"action-cancel-open\"")
    expect(html).not.toContain("data-testid=\"action-confirm\"")
  })

  it("renders POSTED document view with friendly legacy PDF message when snapshot missing", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        entryId="entry-1"
        initialEntry={asEntry(
          baseEntry({
            status: "POSTED",
            submittedAt: "2026-06-14T13:00:00.000Z",
            confirmedAt: "2026-06-14T14:00:00.000Z",
            postedAt: "2026-06-14T15:00:00.000Z",
            postedJournalEntryId: "journal-1",
          })
        )}
      />
    )
    expect(html).toContain('data-testid="finance-document-summary-row"')
    expect(html).toContain("14/06/2026")
    expect(html).toContain("Period: 2026-06")
    expect(html).toContain("finance-voucher-print-root--compact-screen-header")
    expect(html).toContain("finance-voucher-print-root--embedded")
    expect(html).not.toContain('data-testid="action-back"')
    expect(html).not.toContain("Back to manual journal entries")
    expect(html).toContain("posted-journal-link")
    expect(html).toContain(
      `/finance/journal-entries/journal-1?returnTo=${encodeURIComponent("/finance/manual-journal-entries/entry-1")}`
    )
    expect(html).toContain('data-testid="finance-legacy-pdf-snapshot"')
    expect(html).toContain('data-testid="legacy-pdf-missing-message"')
    expect(html).toContain("Archived PDF snapshot is missing")
    expect(html).toContain("Contact an administrator to regenerate")
    expect(html).not.toContain('data-testid="action-regenerate-pdf"')
    expect(html).not.toContain('data-testid="action-print-out"')
    expect(html).not.toContain('data-testid="action-save-pdf"')
    expect(html).not.toContain("data-testid=\"pdf-pending-message\"")
  })

  it("renders POSTED View archived PDF when snapshot exists without print or download actions", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        entryId="entry-1"
        initialEntry={asEntry(
          baseEntry({
            status: "POSTED",
            postedAt: "2026-06-14T15:00:00.000Z",
            postedJournalEntryId: "journal-1",
            pdfPath: "manual-journal/entry-1.pdf",
            pdfGeneratedAt: "2026-06-14T15:01:00.000Z",
            pdfSnapshotReady: true,
          })
        )}
      />
    )
    expect(html).toContain("HO999 • Head Office")
    expect(html).not.toContain("4778631f")
    expect(html).toContain("data-testid=\"action-view-pdf\"")
    expect(html).not.toContain("data-testid=\"action-download-pdf\"")
    expect(html).toContain("View archived PDF")
    expect(html).toContain("data-testid=\"posted-document-actions\"")
    expect(html).not.toContain("data-testid=\"finance-legacy-pdf-snapshot\"")
    expect(html).not.toContain("Archived PDF snapshot")
    expect(html).not.toContain("data-testid=\"action-print-out\"")
    expect(html).not.toContain("data-testid=\"action-save-pdf\"")
    expect(html).toContain("data-testid=\"posted-journal-link\"")
    expect(html).toContain("data-testid=\"finance-voucher-print-sheet\"")
    expect(html).not.toContain("data-testid=\"action-replace-pdf\"")
    expect(html).not.toContain("data-testid=\"action-regenerate-pdf\"")
    expect(html).not.toContain("data-testid=\"pdf-pending-message\"")
    expect(html).not.toContain("data-testid=\"manual-journal-lines-table\"")
  })

  it("HO_FINANCE posted detail shows only View archived PDF and View posted GL journal when archive exists", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        entryId="entry-1"
        initialEntry={asEntry(
          baseEntry({
            status: "POSTED",
            postedAt: "2026-06-14T15:00:00.000Z",
            postedJournalEntryId: "journal-1",
            pdfPath: "manual-journal/entry-1.pdf",
            pdfGeneratedAt: "2026-06-14T15:01:00.000Z",
            pdfSnapshotReady: true,
          })
        )}
      />
    )

    expect(html).toContain('data-testid="action-view-pdf"')
    expect(html).toContain('data-testid="posted-journal-link"')
    expect(html).toContain('data-testid="posted-document-actions"')
    expect(html).toContain('data-testid="posted-document-sticky-bar"')
    expect(html).toContain('data-testid="posted-document-sticky-identity"')
    expect(html).toContain("finance-posted-document-sticky-bar")
    expect(html).toContain("POSTED")
    expect(html).not.toContain('data-testid="finance-legacy-pdf-snapshot"')
    expect(html).not.toContain('data-testid="action-download-pdf"')
    expect(html).not.toContain('data-testid="action-print-out"')
    expect(html).not.toContain('data-testid="action-save-pdf"')
    expect(html).not.toContain('data-testid="action-replace-pdf"')
    expect(html).not.toContain('data-testid="action-delete-pdf"')
    expect(html).not.toContain('data-testid="action-regenerate-pdf"')
  })

  it("shows pending when pdfPath exists but snapshot is not readable", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        entryId="entry-1"
        initialEntry={asEntry(
          baseEntry({
            status: "POSTED",
            postedAt: "2026-06-14T15:00:00.000Z",
            postedJournalEntryId: "journal-1",
            pdfPath: "manual-journal/entry-1.pdf",
            pdfGeneratedAt: "2026-06-14T15:01:00.000Z",
            pdfSnapshotReady: false,
          })
        )}
      />
    )
    expect(html).toContain("data-testid=\"legacy-pdf-missing-message\"")
    expect(html).not.toContain("data-testid=\"action-view-pdf\"")
  })

  it("renders CANCELLED entry view with compact meta row", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        entryId="entry-1"
        initialEntry={asEntry(
          baseEntry({
            status: "CANCELLED",
            cancelledAt: "2026-06-14T16:00:00.000Z",
            cancelReason: "Mistake",
          })
        )}
      />
    )
    expect(html).toContain('data-testid="mjv-entry-meta-row"')
    expect(html).not.toContain('data-testid="mjv-entry-sticky-header"')
    expect(html).toContain("Cancelled")
    expect(html).toContain('data-testid="read-only-notice"')
    expect(html).not.toContain('data-testid="finance-document-header"')
    expect(html).not.toContain('data-testid="action-cancel"')
  })

  it("disables submit and post when unbalanced", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        entryId="entry-1"
        initialEntry={asEntry(
          baseEntry({
            status: "DRAFT",
            lines: [
              {
                id: "line-1",
                lineNo: 1,
                glAccountId: "acc-1",
                accountCode: "1100",
                accountName: "Cash",
                debit: "100.00",
                credit: "0.00",
                memo: null,
              },
              {
                id: "line-2",
                lineNo: 2,
                glAccountId: "acc-2",
                accountCode: "5000",
                accountName: "Expense",
                debit: "0.00",
                credit: "50.00",
                memo: null,
              },
            ],
          })
        )}
      />
    )
    expect(html).toContain("unbalanced-warning")
    expect(html).toContain('data-testid="line-balance-status"')
    expect(html).toContain("Not Balanced")
    expect(html).not.toContain("Debit total")
    expect(html).not.toContain("Credit total")
    expect(html).not.toContain(">Balance</")
    expect(html).toContain(">Total</td>")
    expect(html).toContain("disabled=\"\"")
    expect(html).toContain("data-testid=\"action-submit\"")
  })

  it("renders journal-style totals on read-only submitted entry", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        entryId="entry-1"
        initialEntry={asEntry(
          baseEntry({
            status: "SUBMITTED",
            submittedAt: "2026-06-14T13:00:00.000Z",
          })
        )}
      />
    )
    expect(html).toContain('data-testid="mjv-entry-totals"')
    expect(html).toContain(">Total</td>")
    expect(html).toContain('data-testid="line-total-debit"')
    expect(html).toContain('data-testid="line-total-credit"')
    expect(html).not.toContain("Debit total")
    expect(html).not.toContain("Credit total")
    expect(html).not.toContain('data-testid="line-balance-status"')
  })

  it("displays OPB document number without legal entity prefix", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        entryId="entry-1"
        initialEntry={asEntry(
          baseEntry({
            entryNo: "OPB-260001",
            entryType: "OPENING_BALANCE",
          })
        )}
      />
    )
    expect(html).toContain("OPB-260001")
    expect(html).not.toContain("ASAS-OPB")
  })

  it("shows resolved account as code • name with check mark on draft lines", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        entryId="entry-1"
        initialEntry={asEntry(baseEntry({ status: "DRAFT" }))}
      />
    )
    expect(html).toContain("1100 • Cash")
    expect(html).toContain('data-testid="line-account-status-success"')
    expect(html).not.toContain('data-testid="line-account-status-error"')
    expect(html).not.toContain(">Name</th>")
  })

  it("shows account error state without check mark for invalid code", () => {
    const html = renderToStaticMarkup(
      <MjvLineAccountInput
        lineKey="line-1"
        accountCode="9999"
        accountName=""
        accountError="—"
        focused={false}
        onFocus={() => {}}
        onBlur={() => {}}
        onChange={() => {}}
        onKeyDown={() => {}}
      />
    )
    expect(html).toContain("9999 • —")
    expect(html).toContain('data-testid="line-account-status-error"')
    expect(html).not.toContain('data-testid="line-account-status-success"')
  })
})

describe("manual journal finance document page layout", () => {
  const fs = require("fs") as typeof import("fs")
  const path = require("path") as typeof import("path")
  const ROOT = path.join(__dirname, "..", "..", "..")

  const NARROW_LAYOUT_PATTERNS = [
    "max-w-3xl",
    "max-w-4xl",
    "max-w-[720px]",
    "max-w-[800px]",
    "w-fit",
  ]

  it("wraps journal entries list page in FinanceDocumentContainer with document page shell", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "app", "(main)", "finance", "manual-journal-entries", "page.tsx"),
      "utf8"
    )
    expect(source).toContain("FinanceDocumentContainer")
    expect(source).toContain("financeDocumentPageClass")
    expect(source).not.toContain("financeAdminPageClass")
  })

  it("wraps /finance/journal-entries list in FinanceDocumentContainer with document page shell", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "app", "(main)", "finance", "journal-entries", "page.tsx"),
      "utf8"
    )
    expect(source).toContain("FinanceDocumentContainer")
    expect(source).toContain("financeDocumentPageClass")
    expect(source).not.toContain("financeAdminPageClass")
  })

  it("wraps posted GL journal detail route in financeDocumentPageClass shell", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "app", "(main)", "finance", "journal-entries", "[id]", "page.tsx"),
      "utf8"
    )
    expect(source).toContain("financeDocumentPageClass")
    expect(source).not.toContain("financeAdminPageClass")
  })

  it("wraps manual journal detail page in FinanceDocumentContainer with document page shell", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "app", "(main)", "finance", "manual-journal-entries", "[id]", "page.tsx"),
      "utf8"
    )
    expect(source).toContain("FinanceDocumentContainer")
    expect(source).toContain("financeDocumentPageClass")
    expect(source).toContain("financeAdminContentClass")
    expect(source).toContain("← Journal entries")
    expect(source).not.toContain("financeAdminPageClass")
  })

  it("uses embedded print view without duplicate back link in editor", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "components", "finance", "ManualJournalEntryEditorPage.tsx"),
      "utf8"
    )
    expect(source).toContain("embeddedInDocumentContainer")
    expect(source).toContain("showListBackLink={false}")
    expect(source).toContain("showPrintActions={false}")
    expect(source).toContain("showArchiveDownload={false}")
    expect(source).toContain("compactArchiveActions")
    expect(source).toContain("FinanceDocumentSummaryRow")
    expect(source).toContain('data-testid="manual-journal-entry-editor"')
    expect(source).toContain("w-full")
  })

  it("posted detail screen view does not use nested narrow max-width classes", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage
        mode="edit"
        entryId="entry-1"
        initialEntry={asEntry(
          baseEntry({
            status: "POSTED",
            postedAt: "2026-06-14T15:00:00.000Z",
            postedJournalEntryId: "journal-1",
            pdfPath: "manual-journal/entry-1.pdf",
            pdfGeneratedAt: "2026-06-14T15:01:00.000Z",
            pdfSnapshotReady: true,
          })
        )}
      />
    )

    for (const pattern of NARROW_LAYOUT_PATTERNS) {
      expect(html).not.toContain(pattern)
    }
    expect(html).toContain("finance-voucher-print-root--embedded")
    expect(html).toContain("w-full max-w-full")
    expect(html).toContain("data-testid=\"posted-document-actions\"")
    expect(html).toContain("data-testid=\"posted-document-sticky-bar\"")
    expect(html).toContain("finance-posted-document-sticky-bar")
    expect(html).not.toContain("finance-legacy-pdf-snapshot-panel")
    expect(html).toContain("w-full max-w-full")
  })

  it("scopes print-sheet A4 width overrides to @media print in globals.css", () => {
    const source = fs.readFileSync(path.join(ROOT, "app", "globals.css"), "utf8")
    expect(source).toContain("@media not print")
    expect(source).toContain(".finance-voucher-print-sheet")
    expect(source).toContain("width: 100%")
    expect(source).toMatch(
      /@media print[\s\S]*body\.finance-voucher-print-active \.finance-voucher-print-root/
    )
  })

  it("uses readable screen font scale for embedded posted detail, not print-only sizes", () => {
    const source = fs.readFileSync(path.join(ROOT, "app", "globals.css"), "utf8")
    expect(source).toContain(".finance-voucher-print-root--embedded")
    expect(source).toMatch(
      /@media not print[\s\S]*\.finance-voucher-print-root--embedded[\s\S]*font-size:\s*1rem/
    )
    expect(source).toMatch(
      /@media not print[\s\S]*\.finance-voucher-print-root--embedded[\s\S]*\.finance-voucher-lines-table[\s\S]*font-size:\s*0\.875rem/
    )
    expect(source).toMatch(
      /@media print[\s\S]*body\.finance-voucher-print-active \.finance-voucher-print-root[\s\S]*font-size:\s*14pt/
    )
  })

  it("uses sticky posted document bar on screen only", () => {
    const source = fs.readFileSync(path.join(ROOT, "app", "globals.css"), "utf8")
    expect(source).toContain(".finance-posted-document-sticky-bar")
    expect(source).toMatch(
      /@media not print[\s\S]*\.finance-posted-document-sticky-bar[\s\S]*position:\s*sticky/
    )
    expect(source).toMatch(
      /@media print[\s\S]*\.finance-posted-document-sticky-bar[\s\S]*position:\s*static/
    )
    expect(source).toMatch(
      /@media not print[\s\S]*\.finance-voucher-print-root--embedded \.finance-voucher-lines-table thead th[\s\S]*position:\s*sticky/
    )
    expect(source).toMatch(
      /@media print[\s\S]*\.finance-voucher-print-root--embedded \.finance-voucher-lines-table thead th[\s\S]*position:\s*static/
    )
  })
})

describe("manual journal UI does not call 16B journal-entries API", () => {
  const fs = require("fs") as typeof import("fs")
  const path = require("path") as typeof import("path")
  const ROOT = path.join(__dirname, "..", "..", "..")
  const files = [
    path.join(ROOT, "components", "finance", "ManualJournalEntryListPage.tsx"),
    path.join(ROOT, "components", "finance", "ManualJournalEntryEditorPage.tsx"),
    path.join(ROOT, "lib", "finance-ui", "manual-journal-entries.ts"),
  ]

  for (const filePath of files) {
    it(`${path.basename(filePath)} has no journal-entries fetcher imports`, () => {
      const source = fs.readFileSync(filePath, "utf8")
      expect(source).not.toContain("lib/finance-ui/journal-entries")
      expect(source).not.toMatch(/fetch\([^)]*\/api\/finance\/journal-entries/)
    })
  }
})

describe("MJV line entry keyboard path", () => {
  const fs = require("fs") as typeof import("fs")
  const path = require("path") as typeof import("path")
  const editorPath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "components",
    "finance",
    "ManualJournalEntryEditorPage.tsx"
  )

  it("chains Enter from account through debit, credit, memo, and next line", () => {
    const source = fs.readFileSync(editorPath, "utf8")
    expect(source).toContain('scheduleFocusLineField(lineKey, "debit")')
    expect(source).toContain('scheduleFocusLineField(lineKey, "credit")')
    expect(source).toContain('scheduleFocusLineField(lineKey, "memo")')
    expect(source).toContain('scheduleFocusLineField(newLine.key, "account")')
  })
})

describe("MJV route pages keep dark EntityContextPageHeading", () => {
  const fs = require("fs") as typeof import("fs")
  const path = require("path") as typeof import("path")
  const ROOT = path.join(__dirname, "..", "..", "..")

  it("new MJV page uses EntityContextPageHeading with NEW MANUAL JOURNAL VOUCHER", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "app/(main)/finance/manual-journal-entries/new/page.tsx"),
      "utf8"
    )
    expect(source).toContain("EntityContextPageHeading")
    expect(source).toContain("NEW MANUAL JOURNAL VOUCHER")
  })

  it("edit MJV page uses EntityContextPageHeading with MANUAL JOURNAL VOUCHER", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "app/(main)/finance/manual-journal-entries/[id]/page.tsx"),
      "utf8"
    )
    expect(source).toContain("EntityContextPageHeading")
    expect(source).toContain("MANUAL JOURNAL VOUCHER")
  })
})

describe("PAV UI remains untouched by MJV entry refactor", () => {
  const fs = require("fs") as typeof import("fs")
  const path = require("path") as typeof import("path")
  const ROOT = path.join(__dirname, "..", "..", "..")
  const pavEditor = path.join(ROOT, "components", "finance", "PaymentVoucherEditorPage.tsx")

  it("PaymentVoucherEditorPage does not use mjv-entry sticky header test ids", () => {
    const source = fs.readFileSync(pavEditor, "utf8")
    expect(source).not.toContain("mjv-entry-sticky-header")
    expect(source).not.toContain("mjv-entry-shell")
    expect(source).not.toContain("mjv-entry-lines-table")
    expect(source).not.toContain("mjv-entry-totals")
  })
})
