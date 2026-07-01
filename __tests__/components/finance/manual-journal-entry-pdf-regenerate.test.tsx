/** @jest-environment jsdom */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ManualJournalEntryEditorPage } from "@/components/finance/ManualJournalEntryEditorPage"
import { LEGACY_PDF_SNAPSHOT_DELETE_CONFIRM } from "@/lib/finance-ui/finance-legacy-pdf-snapshot"
import { LEGACY_PDF_SNAPSHOT_REPLACE_NOT_UPDATED_ERROR } from "@/lib/finance-ui/manual-journal-entry-pdf-archive"
import {
  deleteManualJournalEntryArchivedPdf,
  retryManualJournalEntryPdf,
} from "@/lib/finance-ui/manual-journal-entries"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock("@/lib/finance-ui/use-finance-current-return-path", () => ({
  useFinanceCurrentReturnPath: () => "/finance/manual-journal-entries/entry-1",
}))

jest.mock("@/lib/finance-ui/finance-voucher-local-font", () => ({
  financeVoucherLocalFont: {
    variable: "font-finance-voucher",
    className: "font-finance-voucher",
  },
}))

jest.mock("@/lib/finance-ui/manual-journal-entry-session", () => ({
  fetchManualJournalSessionContext: jest.fn().mockResolvedValue({
    staffId: "staff-1",
    branchId: "branch-1",
    branchCode: "HO999",
    branchName: "Head Office",
    documentEntityCode: "AS",
    role: "HO_ADMIN",
  }),
}))

jest.mock("@/lib/finance-ui/manual-journal-entries", () => ({
  fetchManualJournalEntry: jest.fn().mockResolvedValue(null),
  retryManualJournalEntryPdf: jest.fn(),
  deleteManualJournalEntryArchivedPdf: jest.fn(),
  createManualJournalEntryDraft: jest.fn(),
  updateManualJournalEntryDraft: jest.fn(),
  deleteDraftManualJournalEntry: jest.fn(),
  submitManualJournalEntry: jest.fn(),
  confirmManualJournalEntry: jest.fn(),
  cancelManualJournalEntry: jest.fn(),
  postManualJournalEntry: jest.fn(),
  buildManualJournalEntryPdfUrl: (entryId: string) =>
    `/api/finance/manual-journal-entries/${entryId}/pdf`,
}))

const mockRetry = retryManualJournalEntryPdf as jest.Mock
const mockDelete = deleteManualJournalEntryArchivedPdf as jest.Mock

const postedEntry = {
  id: "entry-1",
  entryNo: "MJV-260001",
  entryType: "MANUAL" as const,
  status: "POSTED" as const,
  branchId: "branch-1",
  legalEntityCode: "AS",
  entryDate: "2026-01-31T00:00:00.000Z",
  description: "Test entry",
  refNo: null,
  createdByStaffId: "staff-1",
  submittedAt: "2026-01-31T10:00:00.000Z",
  submittedByStaffId: "staff-1",
  confirmedAt: "2026-01-31T11:00:00.000Z",
  confirmedByStaffId: "staff-1",
  postedAt: "2026-01-31T12:00:00.000Z",
  postedByStaffId: "staff-1",
  cancelledAt: null,
  cancelledByStaffId: null,
  cancelReason: null,
  postedVoucherId: "voucher-1",
  postedJournalEntryId: "journal-1",
  reversalJournalEntryId: null,
  pdfPath: null,
  pdfBlobUrl: null,
  pdfGeneratedAt: null,
  pdfSnapshotReady: false,
  createdAt: "2026-01-31T09:00:00.000Z",
  updatedAt: "2026-01-31T12:00:00.000Z",
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
}

const postedEntryWithArchive = {
  ...postedEntry,
  pdfPath: "manual-journal/entry-1.pdf",
  pdfGeneratedAt: "2026-01-31T12:01:00.000Z",
  pdfSnapshotReady: true,
}

describe("ManualJournalEntryEditorPage archived PDF regenerate", () => {
  let container: HTMLDivElement
  let root: Root
  let confirmSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true)
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    confirmSpy.mockRestore()
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("hides missing archive panel and shows view action after successful regenerate", async () => {
    mockRetry.mockResolvedValueOnce({
      entry: {
        ...postedEntry,
        pdfPath: "manual-journal/entry-1.pdf",
        pdfGeneratedAt: "2026-01-31T12:05:00.000Z",
        pdfSnapshotReady: true,
      },
      pdfStatus: "ready",
    })

    await act(async () => {
      root.render(
        <ManualJournalEntryEditorPage
          mode="edit"
          entryId="entry-1"
          initialEntry={postedEntry}
        />
      )
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="action-regenerate-pdf"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="action-view-pdf"]')).toBeNull()

    const regenerateButton = container.querySelector('[data-testid="action-regenerate-pdf"]')
    if (!(regenerateButton instanceof HTMLButtonElement)) {
      throw new Error("Regenerate button not found")
    }

    await act(async () => {
      regenerateButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockRetry).toHaveBeenCalledWith("entry-1")
    expect(container.querySelector('[data-testid="action-view-pdf"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="finance-legacy-pdf-snapshot"]')).toBeNull()
    expect(container.querySelector('[data-testid="action-download-pdf"]')).toBeNull()
    expect(container.querySelector('[data-testid="action-print-out"]')).toBeNull()
    expect(container.querySelector('[data-testid="action-save-pdf"]')).toBeNull()
    expect(container.querySelector('[data-testid="action-archive-repair-toggle"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="action-replace-pdf"]')).toBeNull()
    expect(container.querySelector('[data-testid="action-delete-pdf"]')).toBeNull()
    expect(container.querySelector('[data-testid="action-regenerate-pdf"]')).toBeNull()
    expect(container.querySelector('[data-testid="legacy-pdf-missing-message"]')).toBeNull()
    expect(container.textContent).toContain("Archived PDF regenerated.")
  })

  it("shows replace action for HO_ADMIN when archive already exists and keeps view actions after replace", async () => {
    mockRetry.mockResolvedValueOnce({
      entry: {
        ...postedEntryWithArchive,
        pdfGeneratedAt: "2026-01-31T12:10:00.000Z",
      },
      pdfStatus: "ready",
    })

    await act(async () => {
      root.render(
        <ManualJournalEntryEditorPage
          mode="edit"
          entryId="entry-1"
          initialEntry={postedEntryWithArchive}
        />
      )
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="action-view-pdf"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="finance-legacy-pdf-snapshot"]')).toBeNull()
    expect(container.querySelector('[data-testid="action-download-pdf"]')).toBeNull()
    expect(container.querySelector('[data-testid="action-print-out"]')).toBeNull()
    expect(container.querySelector('[data-testid="action-archive-repair-toggle"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="action-replace-pdf"]')).toBeNull()
    expect(container.querySelector('[data-testid="action-delete-pdf"]')).toBeNull()
    expect(container.querySelector('[data-testid="action-regenerate-pdf"]')).toBeNull()

    const repairToggle = container.querySelector('[data-testid="action-archive-repair-toggle"]')
    if (!(repairToggle instanceof HTMLButtonElement)) {
      throw new Error("Archive repair toggle not found")
    }

    await act(async () => {
      repairToggle.click()
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="action-replace-pdf"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="action-delete-pdf"]')).not.toBeNull()

    const replaceButton = container.querySelector('[data-testid="action-replace-pdf"]')
    if (!(replaceButton instanceof HTMLButtonElement)) {
      throw new Error("Replace button not found")
    }

    await act(async () => {
      replaceButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockRetry).toHaveBeenCalledWith("entry-1")
    expect(container.querySelector('[data-testid="action-view-pdf"]')).not.toBeNull()
    expect(container.textContent).toContain("Archived PDF regenerated.")
  })

  it("shows error when replace succeeds but archive metadata is unchanged", async () => {
    mockRetry.mockResolvedValueOnce({
      entry: postedEntryWithArchive,
      pdfStatus: "ready",
    })

    await act(async () => {
      root.render(
        <ManualJournalEntryEditorPage
          mode="edit"
          entryId="entry-1"
          initialEntry={postedEntryWithArchive}
        />
      )
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const repairToggle = container.querySelector('[data-testid="action-archive-repair-toggle"]')
    if (!(repairToggle instanceof HTMLButtonElement)) {
      throw new Error("Archive repair toggle not found")
    }

    await act(async () => {
      repairToggle.click()
      await Promise.resolve()
    })

    const replaceButton = container.querySelector('[data-testid="action-replace-pdf"]')
    if (!(replaceButton instanceof HTMLButtonElement)) {
      throw new Error("Replace button not found")
    }

    await act(async () => {
      replaceButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(container.textContent).toContain(LEGACY_PDF_SNAPSHOT_REPLACE_NOT_UPDATED_ERROR)
    expect(container.textContent).not.toContain("Archived PDF regenerated.")
  })

  it("deletes archived PDF and shows missing regenerate state", async () => {
    mockDelete.mockResolvedValueOnce({
      entry: {
        ...postedEntryWithArchive,
        pdfPath: null,
        pdfGeneratedAt: null,
        pdfSnapshotReady: false,
      },
    })

    await act(async () => {
      root.render(
        <ManualJournalEntryEditorPage
          mode="edit"
          entryId="entry-1"
          initialEntry={postedEntryWithArchive}
        />
      )
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const repairToggle = container.querySelector('[data-testid="action-archive-repair-toggle"]')
    if (!(repairToggle instanceof HTMLButtonElement)) {
      throw new Error("Archive repair toggle not found")
    }

    await act(async () => {
      repairToggle.click()
      await Promise.resolve()
    })

    const deleteButton = container.querySelector('[data-testid="action-delete-pdf"]')
    if (!(deleteButton instanceof HTMLButtonElement)) {
      throw new Error("Delete button not found")
    }

    await act(async () => {
      deleteButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(confirmSpy).toHaveBeenCalledWith(LEGACY_PDF_SNAPSHOT_DELETE_CONFIRM)
    expect(mockDelete).toHaveBeenCalledWith("entry-1")
    expect(container.querySelector('[data-testid="action-regenerate-pdf"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="action-view-pdf"]')).toBeNull()
    expect(container.querySelector('[data-testid="legacy-pdf-missing-message"]')).not.toBeNull()
    expect(container.textContent).toContain("Archived PDF deleted.")
  })
})
