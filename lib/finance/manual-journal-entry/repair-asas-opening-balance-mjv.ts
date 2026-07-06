import type { Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { prisma } from "@/lib/shared/prisma"
import { loadPostedManualJournalEntryPdfSnapshot } from "./manual-journal-entry-pdf"
import { renderManualJournalEntryPdf } from "./manual-journal-entry-pdf-render"
import { storeManualJournalPdf } from "./manual-journal-entry-pdf-storage"
import { applyPdfSnapshot } from "./manual-journal-entry-status"

/**
 * One-time historical correction (Jul 2026):
 * ASAS Opening Balance 2026 uses entry date 31.12.2025 / accounting period 2025-12,
 * but fiscal document identity is MJV-260001 (opening fiscal year 2026), matching ASAD.
 * Auto-allocation keyed off Bangkok calendar year of entryDate produced MJV-250001.
 */
export const ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET = {
  sourceEntryNo: "MJV-250001",
  targetEntryNo: "MJV-260001",
  legalEntityCode: "AS",
  description: "Opening Balance 2026",
} as const satisfies {
  sourceEntryNo: string
  targetEntryNo: string
  legalEntityCode: DocumentEntityCode
  description: string
}

export class RepairAsasOpeningBalanceMjvError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "RepairAsasOpeningBalanceMjvError"
    this.code = code
  }
}

export type RepairAsasOpeningBalanceMjvAudit = {
  entryId: string
  legalEntityCode: string
  description: string | null
  status: string
  oldEntryNo: string
  newEntryNo: string
  postedVoucherId: string | null
  postedJournalEntryId: string | null
  voucherRefNoUpdated: boolean
  documentArchiveLinksUpdated: number
  pdfCleared: boolean
}

type RenumberTargetRow = {
  id: string
  entryNo: string
  legalEntityCode: string
  status: string
  description: string | null
  postedVoucherId: string | null
  postedJournalEntryId: string | null
  pdfPath: string | null
  pdfBlobUrl: string | null
  postedVoucher: { id: string; refNo: string | null; voucherNo: string } | null
}

async function assertNoTargetConflict(
  tx: Prisma.TransactionClient,
  legalEntityCode: DocumentEntityCode,
  targetEntryNo: string,
  sourceEntryId: string
): Promise<void> {
  const conflict = await tx.manualJournalEntry.findFirst({
    where: {
      legalEntityCode,
      entryNo: targetEntryNo,
      NOT: { id: sourceEntryId },
    },
    select: { id: true, entryNo: true, status: true },
  })

  if (conflict) {
    throw new RepairAsasOpeningBalanceMjvError(
      `Cannot rename — ${legalEntityCode} already has ${targetEntryNo} (${conflict.status}, id ${conflict.id})`,
      "TARGET_ENTRY_NO_CONFLICT"
    )
  }
}

async function loadRenumberTarget(
  tx: Prisma.TransactionClient
): Promise<RenumberTargetRow> {
  const { sourceEntryNo, legalEntityCode, description } =
    ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET

  const matches = await tx.manualJournalEntry.findMany({
    where: {
      legalEntityCode,
      entryNo: sourceEntryNo,
      description,
    },
    include: {
      postedVoucher: {
        select: { id: true, refNo: true, voucherNo: true },
      },
    },
  })

  if (matches.length === 0) {
    throw new RepairAsasOpeningBalanceMjvError(
      `No ${legalEntityCode} manual journal entry found for ${sourceEntryNo} / "${description}"`,
      "NOT_FOUND"
    )
  }
  if (matches.length > 1) {
    throw new RepairAsasOpeningBalanceMjvError(
      `Multiple ${legalEntityCode} manual journal entries found for ${sourceEntryNo} / "${description}"`,
      "AMBIGUOUS_TARGET"
    )
  }

  const entry = matches[0]!

  if (entry.legalEntityCode !== legalEntityCode) {
    throw new RepairAsasOpeningBalanceMjvError(
      `Target voucher is not ${legalEntityCode}`,
      "WRONG_LEGAL_ENTITY"
    )
  }

  return entry
}

function buildAudit(
  entry: RenumberTargetRow,
  input: {
    voucherRefNoUpdated: boolean
    documentArchiveLinksUpdated: number
    pdfCleared: boolean
  }
): RepairAsasOpeningBalanceMjvAudit {
  const { targetEntryNo } = ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET

  return {
    entryId: entry.id,
    legalEntityCode: entry.legalEntityCode,
    description: entry.description,
    status: entry.status,
    oldEntryNo: entry.entryNo,
    newEntryNo: targetEntryNo,
    postedVoucherId: entry.postedVoucherId,
    postedJournalEntryId: entry.postedJournalEntryId,
    voucherRefNoUpdated: input.voucherRefNoUpdated,
    documentArchiveLinksUpdated: input.documentArchiveLinksUpdated,
    pdfCleared: input.pdfCleared,
  }
}

export async function planRepairAsasOpeningBalanceMjv(
  tx: Prisma.TransactionClient = prisma
): Promise<RepairAsasOpeningBalanceMjvAudit> {
  const entry = await loadRenumberTarget(tx)
  const { targetEntryNo, legalEntityCode } = ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET

  if (entry.entryNo === targetEntryNo) {
    return buildAudit(entry, {
      voucherRefNoUpdated: false,
      documentArchiveLinksUpdated: 0,
      pdfCleared: false,
    })
  }

  await assertNoTargetConflict(tx, legalEntityCode, targetEntryNo, entry.id)

  const archiveLinkCount = await tx.documentArchiveLink.count({
    where: {
      documentKind: "MJV",
      documentId: entry.id,
      documentNo: entry.entryNo,
    },
  })

  return buildAudit(entry, {
    voucherRefNoUpdated: Boolean(entry.postedVoucher),
    documentArchiveLinksUpdated: archiveLinkCount,
    pdfCleared: Boolean(entry.pdfPath?.trim() || entry.pdfBlobUrl?.trim()),
  })
}

export type ExecuteRepairAsasOpeningBalanceMjvResult = {
  audit: RepairAsasOpeningBalanceMjvAudit
  pdfRegenerated: boolean
  pdfRegenerationError?: string
}

export async function executeRepairAsasOpeningBalanceMjv(input?: {
  regeneratePdf?: boolean
}): Promise<ExecuteRepairAsasOpeningBalanceMjvResult> {
  const audit = await prisma.$transaction(async (tx) => {
    const entry = await loadRenumberTarget(tx)
    const { targetEntryNo, legalEntityCode } = ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET

    if (entry.entryNo === targetEntryNo) {
      return buildAudit(entry, {
        voucherRefNoUpdated: false,
        documentArchiveLinksUpdated: 0,
        pdfCleared: false,
      })
    }

    await assertNoTargetConflict(tx, legalEntityCode, targetEntryNo, entry.id)

    const hadPdf =
      Boolean(entry.pdfPath?.trim()) || Boolean(entry.pdfBlobUrl?.trim())

    await tx.manualJournalEntry.update({
      where: { id: entry.id },
      data: {
        entryNo: targetEntryNo,
        ...(hadPdf
          ? { pdfPath: null, pdfBlobUrl: null, pdfGeneratedAt: null }
          : {}),
      },
    })

    let voucherRefNoUpdated = false
    if (entry.postedVoucher) {
      await tx.voucher.update({
        where: { id: entry.postedVoucher.id },
        data: { refNo: targetEntryNo },
      })
      voucherRefNoUpdated = true
    }

    const archiveLinks = await tx.documentArchiveLink.updateMany({
      where: {
        documentKind: "MJV",
        documentId: entry.id,
        documentNo: entry.entryNo,
      },
      data: { documentNo: targetEntryNo },
    })

    return buildAudit(entry, {
      voucherRefNoUpdated,
      documentArchiveLinksUpdated: archiveLinks.count,
      pdfCleared: hadPdf,
    })
  })

  let pdfRegenerated = false
  let pdfRegenerationError: string | undefined

  if (input?.regeneratePdf && audit.pdfCleared && audit.status === "POSTED") {
    const pdfResult = await attachPdfFromPostedEntry(
      audit.entryId,
      ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET.legalEntityCode
    )
    if (pdfResult.ok) {
      pdfRegenerated = true
    } else {
      pdfRegenerationError = pdfResult.error
    }
  }

  return { audit, pdfRegenerated, pdfRegenerationError }
}

async function attachPdfFromPostedEntry(
  entryId: string,
  legalEntityCode: DocumentEntityCode
): Promise<{ ok: true } | { ok: false; error: string }> {
  const snapshot = await loadPostedManualJournalEntryPdfSnapshot(
    prisma,
    entryId,
    legalEntityCode
  )
  if (!snapshot) {
    return {
      ok: false,
      error: "Posted manual journal entry snapshot is not available for PDF attach",
    }
  }

  try {
    const buffer = await renderManualJournalEntryPdf(snapshot)
    const stored = await storeManualJournalPdf(entryId, buffer)
    const pdfGeneratedAt = new Date()
    await prisma.$transaction((tx) =>
      applyPdfSnapshot(tx, {
        entryId,
        pdfPath: stored.pdfPath,
        pdfBlobUrl: stored.pdfBlobUrl,
        pdfGeneratedAt,
      })
    )
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PDF attach failed"
    return { ok: false, error: message }
  }
}

export function formatRepairAsasOpeningBalanceMjvAudit(
  audit: RepairAsasOpeningBalanceMjvAudit
): string {
  return [
    "ASAS opening balance MJV renumber audit",
    `  entryId: ${audit.entryId}`,
    `  legalEntityCode: ${audit.legalEntityCode}`,
    `  description: ${audit.description ?? "(none)"}`,
    `  status: ${audit.status}`,
    `  entryNo: ${audit.oldEntryNo} -> ${audit.newEntryNo}`,
    `  postedVoucherId: ${audit.postedVoucherId ?? "(none)"}`,
    `  postedJournalEntryId: ${audit.postedJournalEntryId ?? "(none)"}`,
    `  voucherRefNoUpdated: ${audit.voucherRefNoUpdated}`,
    `  documentArchiveLinksUpdated: ${audit.documentArchiveLinksUpdated}`,
    `  pdfCleared: ${audit.pdfCleared}`,
  ].join("\n")
}
