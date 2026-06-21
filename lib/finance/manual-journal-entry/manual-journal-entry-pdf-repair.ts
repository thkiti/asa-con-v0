import { prisma } from "@/lib/shared/prisma"
import { renderManualJournalEntryPdf } from "./manual-journal-entry-pdf-render"
import { loadPostedManualJournalEntryPdfSnapshot } from "./manual-journal-entry-pdf"
import { storeManualJournalPdf } from "./manual-journal-entry-pdf-storage"
import { applyPdfSnapshotRepair } from "./manual-journal-entry-status"

export type RegenerateManualJournalEntryArchivedPdfResult =
  | { ok: true; pdfPath: string; pdfGeneratedAt: Date }
  | { ok: false; error: string }

/**
 * Explicit repair: re-render and replace bytes for an existing archived PDF snapshot.
 * Does not use attachManualJournalEntryPdfFromSnapshot (which skips when pdfPath exists).
 */
export async function regenerateManualJournalEntryArchivedPdf(
  entryId: string
): Promise<RegenerateManualJournalEntryArchivedPdfResult> {
  const id = String(entryId ?? "").trim()
  if (!id) {
    return { ok: false, error: "entryId is required" }
  }

  const existing = await prisma.manualJournalEntry.findUnique({
    where: { id },
    select: {
      status: true,
      pdfPath: true,
      pdfBlobUrl: true,
    },
  })

  if (!existing) {
    return { ok: false, error: "Manual journal entry not found" }
  }

  if (existing.status !== "POSTED") {
    return {
      ok: false,
      error: "PDF snapshot repair requires POSTED status",
    }
  }

  const hasArchivedPdf =
    Boolean(String(existing.pdfPath ?? "").trim()) ||
    Boolean(String(existing.pdfBlobUrl ?? "").trim())
  if (!hasArchivedPdf) {
    return {
      ok: false,
      error:
        "PDF snapshot repair requires an existing archived PDF; use attach for first-time generation",
    }
  }

  const snapshot = await loadPostedManualJournalEntryPdfSnapshot(prisma, id)
  if (!snapshot) {
    return {
      ok: false,
      error: "Posted manual journal entry snapshot is not available for PDF repair",
    }
  }

  if (snapshot.entryId !== id) {
    return { ok: false, error: "Snapshot entry id mismatch" }
  }

  try {
    const buffer = await renderManualJournalEntryPdf(snapshot)
    const stored = await storeManualJournalPdf(id, buffer)
    const pdfGeneratedAt = new Date()

    await prisma.$transaction((tx) =>
      applyPdfSnapshotRepair(tx, {
        entryId: id,
        pdfPath: stored.pdfPath,
        pdfBlobUrl: stored.pdfBlobUrl,
        pdfGeneratedAt,
      })
    )

    return { ok: true, pdfPath: stored.pdfPath, pdfGeneratedAt }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PDF repair failed"
    console.error("MANUAL_JOURNAL_ENTRY_PDF_REPAIR:", err)
    return { ok: false, error: message }
  }
}
