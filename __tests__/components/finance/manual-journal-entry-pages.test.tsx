import { renderToStaticMarkup } from "react-dom/server"
import { ManualJournalEntryEditorPage } from "@/components/finance/ManualJournalEntryEditorPage"
import { ManualJournalEntryListPage } from "@/components/finance/ManualJournalEntryListPage"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock("@/lib/finance-ui/manual-journal-entries", () => ({
  fetchManualJournalEntries: jest.fn().mockResolvedValue({
    entries: [
      {
        id: "entry-1",
        entryNo: "MAJ-260001",
        entryType: "MANUAL",
        status: "DRAFT",
        branchId: "branch-1",
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
    entryNo: "MAJ-260001",
    entryType: "MANUAL",
    status: "DRAFT",
    branchId: "branch-1",
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
  it("renders list filters and entry link", () => {
    const html = renderToStaticMarkup(<ManualJournalEntryListPage />)
    expect(html).toContain("data-testid=\"manual-journal-entry-list\"")
    expect(html).toContain("filter-status")
    expect(html).toContain("filter-entry-type")
    expect(html).toContain("filter-legal-entity")
    expect(html).toContain("Loading entries")
    expect(html).not.toContain("ASAS-MAJ")
    expect(html).not.toContain("ASAD-MAJ")
    expect(html).toContain("/finance/manual-journal-entries/new")
  })
})

describe("ManualJournalEntryEditorPage create", () => {
  it("renders draft create actions and line editor", () => {
    const html = renderToStaticMarkup(
      <ManualJournalEntryEditorPage mode="create" initialEntryType="MANUAL" />
    )
    expect(html).toContain("data-testid=\"manual-journal-entry-editor\"")
    expect(html).toContain("MAJ (draft)")
    expect(html).not.toContain("ASAS-MAJ")
    expect(html).toContain("data-testid=\"action-save\"")
    expect(html).toContain("data-testid=\"action-submit\"")
    expect(html).toContain("data-testid=\"line-account-code\"")
    expect(html).toContain("data-testid=\"line-account-name\"")
    expect(html).not.toContain("data-testid=\"action-delete\"")
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
    expect(html).toContain("MAJ-260001")
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

  it("renders POSTED document view with PDF pending when snapshot missing", () => {
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
    expect(html).toContain('data-testid="finance-document-header"')
    expect(html).toContain('data-testid="finance-document-identity-row2"')
    expect(html).toContain("Entry Date: 14.06.2026")
    expect(html).toContain("Period: 2026-06")
    expect(html).toContain("Status: POSTED")
    expect(html).toContain('data-testid="finance-document-workflow-audit"')
    expect(html).toContain("Posted: 14.06.2026")
    expect(html).not.toContain('data-testid="read-only-notice"')
    expect(html).not.toContain('data-testid="field-branch-id"')
    expect(html).not.toContain('data-testid="field-entry-date"')
    expect(html).not.toContain('data-testid="field-description"')
    expect(html).not.toContain("data-testid=\"action-post\"")
    expect(html).not.toContain("data-testid=\"action-save\"")
    expect(html).toContain("posted-journal-link")
    expect(html).toContain("data-testid=\"pdf-pending-message\"")
    expect(html).toContain("data-testid=\"action-retry-pdf\"")
  })

  it("renders POSTED View/Download PDF when snapshot exists", () => {
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
    expect(html).toContain("data-testid=\"action-view-pdf\"")
    expect(html).toContain("data-testid=\"action-download-pdf\"")
    expect(html).not.toContain("data-testid=\"pdf-pending-message\"")
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
    expect(html).toContain("data-testid=\"pdf-pending-message\"")
    expect(html).not.toContain("data-testid=\"action-view-pdf\"")
  })

  it("renders CANCELLED document view", () => {
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
    expect(html).toContain('data-testid="finance-document-header"')
    expect(html).toContain('data-testid="finance-document-workflow-audit"')
    expect(html).toContain("Cancelled: 14.06.2026")
    expect(html).toContain("Status: CANCELLED")
    expect(html).not.toContain('data-testid="read-only-notice"')
    expect(html).not.toContain('data-testid="field-branch-id"')
    expect(html).not.toContain("data-testid=\"action-cancel\"")
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
    expect(html).toContain("disabled=\"\"")
    expect(html).toContain("data-testid=\"action-submit\"")
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
