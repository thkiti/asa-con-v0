import {
  cancelManualJournalEntry,
  createManualJournalEntryDraft,
  deleteDraftManualJournalEntry,
  fetchManualJournalEntries,
  fetchManualJournalEntry,
  postManualJournalEntry,
  submitManualJournalEntry,
  updateManualJournalEntryDraft,
} from "@/lib/finance-ui/manual-journal-entries"

describe("manual-journal-entries UI fetchers", () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it("fetchManualJournalEntries builds query and returns JSON", async () => {
    const dto = { entries: [], total: 0 }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => dto,
    })

    await expect(
      fetchManualJournalEntries({
        legalEntityCode: "AS",
        status: "DRAFT",
        entryType: "MANUAL",
        dateFrom: "2026-06-01",
        dateTo: "2026-06-30",
      })
    ).resolves.toEqual(dto)

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/manual-journal-entries?legalEntityCode=AS&status=DRAFT&entryType=MANUAL&dateFrom=2026-06-01&dateTo=2026-06-30"
    )
  })

  it("fetchManualJournalEntry returns entry from detail response", async () => {
    const entry = { id: "entry-1", entryNo: "MAJ-2620001" }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ entry }),
    })

    await expect(fetchManualJournalEntry("entry-1")).resolves.toEqual(entry)
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/manual-journal-entries/entry-1"
    )
  })

  it("createManualJournalEntryDraft POSTs payload", async () => {
    const entry = { id: "entry-1" }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ entry }),
    })

    const payload = {
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate: "2026-06-14",
      entryType: "MANUAL",
      lines: [{ accountCode: "1100", debit: "100", credit: "0" }],
    }

    await expect(createManualJournalEntryDraft(payload)).resolves.toEqual(entry)
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/manual-journal-entries",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    )
  })

  it("updateManualJournalEntryDraft PATCHes payload", async () => {
    const entry = { id: "entry-1" }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ entry }),
    })

    const payload = {
      lines: [{ accountCode: "1100", debit: "50", credit: "0" }],
    }

    await expect(updateManualJournalEntryDraft("entry-1", payload)).resolves.toEqual(entry)
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/manual-journal-entries/entry-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    )
  })

  it("deleteDraftManualJournalEntry DELETEs", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })
    await deleteDraftManualJournalEntry("entry-1")
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/manual-journal-entries/entry-1",
      { method: "DELETE" }
    )
  })

  it("workflow POST helpers call correct paths", async () => {
    const entry = { id: "entry-1" }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ entry }),
    })

    await submitManualJournalEntry("entry-1")
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/manual-journal-entries/entry-1/submit",
      { method: "POST" }
    )

    await postManualJournalEntry("entry-1")
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/manual-journal-entries/entry-1/post",
      { method: "POST" }
    )

    await cancelManualJournalEntry("entry-1", { cancelReason: "test" })
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/finance/manual-journal-entries/entry-1/cancel",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ cancelReason: "test" }),
      })
    )
  })

  it("throws API error message on failure", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: "Conflict",
      json: async () => ({ error: "cannot submit", code: "INVALID_TRANSITION" }),
    })

    await expect(fetchManualJournalEntry("entry-1")).rejects.toThrow(
      "cannot submit (INVALID_TRANSITION)"
    )
  })
})
