import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "./manual-journal-entry-errors"
import { renderManualJournalEntryPdf } from "./manual-journal-entry-pdf-render"
import { storeManualJournalPdf } from "./manual-journal-entry-pdf-storage"
import { buildManualJournalEntryPdfSnapshot } from "./manual-journal-entry-pdf-snapshot"
import type { ManualJournalEntryPdfSnapshot } from "./manual-journal-entry-pdf-snapshot-types"
import { applyPdfSnapshot } from "./manual-journal-entry-status"
import type { ManualJournalEntryWithLines } from "./manual-journal-entry-types"

export type AttachManualJournalEntryPdfResult =
  | { ok: true; pdfPath: string; pdfGeneratedAt: Date }
  | { ok: false; error: string }

async function attachPdfSnapshotInDb(
  entryId: string,
  stored: { pdfPath: string; pdfBlobUrl: string | null },
  pdfGeneratedAt: Date,
  tx?: Prisma.TransactionClient
): Promise<ManualJournalEntryWithLines> {
  const run = async (client: Prisma.TransactionClient) =>
    applyPdfSnapshot(client, {
      entryId,
      pdfPath: stored.pdfPath,
      pdfBlobUrl: stored.pdfBlobUrl,
      pdfGeneratedAt,
    })

  if (tx) return run(tx)
  return prisma.$transaction(run)
}

/**
 * Render frozen snapshot, store PDF once, and persist pdfPath via domain status module.
 * Never re-renders when pdfPath already exists.
 */
export async function attachManualJournalEntryPdfFromSnapshot(
  entryId: string,
  snapshot: ManualJournalEntryPdfSnapshot,
  options?: { tx?: Prisma.TransactionClient }
): Promise<AttachManualJournalEntryPdfResult> {
  const id = String(entryId ?? "").trim()
  if (!id) {
    return { ok: false, error: "entryId is required" }
  }

  if (snapshot.entryId !== id) {
    return { ok: false, error: "Snapshot entry id mismatch" }
  }

  const client = options?.tx ?? prisma
  const existing = await client.manualJournalEntry.findUnique({
    where: { id },
    select: { status: true, pdfPath: true, pdfGeneratedAt: true },
  })

  if (!existing) {
    return { ok: false, error: "Manual journal entry not found" }
  }

  if (existing.status !== "POSTED") {
    return { ok: false, error: "PDF snapshot requires POSTED status" }
  }

  if (existing.pdfPath) {
    if (!existing.pdfGeneratedAt) {
      return { ok: false, error: "PDF path already set but metadata missing" }
    }
    return {
      ok: true,
      pdfPath: existing.pdfPath,
      pdfGeneratedAt: existing.pdfGeneratedAt,
    }
  }

  try {
    const buffer = await renderManualJournalEntryPdf(snapshot)
    const stored = await storeManualJournalPdf(id, buffer)
    const pdfGeneratedAt = new Date()
    await attachPdfSnapshotInDb(id, stored, pdfGeneratedAt, options?.tx)
    return { ok: true, pdfPath: stored.pdfPath, pdfGeneratedAt }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PDF generation failed"
    console.error("MANUAL_JOURNAL_ENTRY_PDF_ATTACH:", err)
    return { ok: false, error: message }
  }
}

export async function loadPostedManualJournalEntryPdfSnapshot(
  tx: Pick<Prisma.TransactionClient, "manualJournalEntry" | "voucher">,
  entryId: string
): Promise<ManualJournalEntryPdfSnapshot | null> {
  const entry = await tx.manualJournalEntry.findUnique({
    where: { id: entryId },
    include: {
      lines: {
        orderBy: { lineNo: "asc" },
        include: {
          glAccount: { select: { code: true, name: true } },
        },
      },
    },
  })

  if (
    !entry ||
    entry.status !== "POSTED" ||
    !entry.postedAt ||
    !entry.postedByStaffId ||
    !entry.postedVoucherId ||
    !entry.postedJournalEntryId
  ) {
    return null
  }

  const voucher = await tx.voucher.findUnique({
    where: { id: entry.postedVoucherId },
    select: { id: true, voucherNo: true },
  })

  if (!voucher) {
    throw new ManualJournalEntryError(
      "Posted voucher not found for manual journal entry",
      ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  return buildManualJournalEntryPdfSnapshot(
    {
      id: entry.id,
      entryNo: entry.entryNo,
      entryType: entry.entryType,
      branchId: entry.branchId,
      legalEntityCode: entry.legalEntityCode,
      entryDate: entry.entryDate,
      description: entry.description,
      refNo: entry.refNo,
      postedAt: entry.postedAt,
      postedByStaffId: entry.postedByStaffId,
      lines: entry.lines,
    },
    {
      voucherId: voucher.id,
      voucherNo: voucher.voucherNo,
      journalEntryId: entry.postedJournalEntryId,
    }
  )
}
