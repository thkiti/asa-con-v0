import type { Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import { bootstrapPeriodIfMissing } from "@/lib/finance/period-setup"
import { accountingPeriodUniqueWhere } from "@/lib/finance/period-lookup"
import { prisma } from "@/lib/shared/prisma"
import { loadPostedManualJournalEntryPdfSnapshot } from "./manual-journal-entry-pdf"
import { renderManualJournalEntryPdf } from "./manual-journal-entry-pdf-render"
import { storeManualJournalPdf } from "./manual-journal-entry-pdf-storage"
import { applyPdfSnapshot } from "./manual-journal-entry-status"

export const ASAD_OPENING_BALANCE_REPAIR_TARGET = {
  entryNo: "MJV-260001",
  legalEntityCode: "AD",
  targetPeriodKey: "2025-12",
  correctedEntryDate: new Date("2025-12-31T00:00:00.000Z"),
} as const satisfies {
  entryNo: string
  legalEntityCode: DocumentEntityCode
  targetPeriodKey: string
  correctedEntryDate: Date
}

export class RepairAsadOpeningBalanceError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "RepairAsadOpeningBalanceError"
    this.code = code
  }
}

export type RepairAsadOpeningBalanceAudit = {
  entryId: string
  documentNo: string
  legalEntityCode: string
  description: string | null
  status: string
  oldEntryDate: string
  newEntryDate: string
  oldPeriodKey: string
  newPeriodKey: string
  oldPeriodId: string
  newPeriodId: string
  postedJournalEntryId: string
  postedVoucherId: string
  pdfCleared: boolean
  periodBootstrapped: boolean
}

type RepairTargetRow = {
  id: string
  entryNo: string
  legalEntityCode: string
  status: string
  entryDate: Date
  description: string | null
  postedJournalEntryId: string | null
  postedVoucherId: string | null
  pdfPath: string | null
  pdfBlobUrl: string | null
  branchId: string
  lines: Array<{ debit: Prisma.Decimal; credit: Prisma.Decimal }>
  postedJournalEntry: {
    id: string
    date: Date
    periodId: string
    legalEntityCode: string
    period: { id: string; periodKey: string; legalEntityCode: string }
  } | null
  postedVoucher: {
    id: string
    date: Date
    periodId: string
    legalEntityCode: string
    voucherNo: string
  } | null
}

function assertJournalLinesBalance(
  lines: Array<{ debit: Prisma.Decimal; credit: Prisma.Decimal }>
): void {
  let debitTotal = ZERO
  let creditTotal = ZERO
  for (const line of lines) {
    debitTotal = addMoney(debitTotal, toMoney(line.debit))
    creditTotal = addMoney(creditTotal, toMoney(line.credit))
  }
  if (!debitTotal.equals(creditTotal)) {
    throw new RepairAsadOpeningBalanceError(
      `Journal lines do not balance (debit ${debitTotal.toString()}, credit ${creditTotal.toString()})`,
      "UNBALANCED_JOURNAL"
    )
  }
}

async function loadRepairTarget(
  tx: Prisma.TransactionClient
): Promise<RepairTargetRow> {
  const { entryNo, legalEntityCode } = ASAD_OPENING_BALANCE_REPAIR_TARGET

  const matches = await tx.manualJournalEntry.findMany({
    where: { entryNo, legalEntityCode },
    include: {
      lines: { select: { debit: true, credit: true } },
      postedJournalEntry: {
        include: {
          period: {
            select: { id: true, periodKey: true, legalEntityCode: true },
          },
        },
      },
      postedVoucher: {
        select: {
          id: true,
          date: true,
          periodId: true,
          legalEntityCode: true,
          voucherNo: true,
        },
      },
    },
  })

  if (matches.length === 0) {
    throw new RepairAsadOpeningBalanceError(
      `No AD manual journal entry found for ${entryNo}`,
      "NOT_FOUND"
    )
  }
  if (matches.length > 1) {
    throw new RepairAsadOpeningBalanceError(
      `Multiple AD manual journal entries found for ${entryNo}`,
      "AMBIGUOUS_TARGET"
    )
  }

  const entry = matches[0]!

  if (entry.legalEntityCode !== legalEntityCode) {
    throw new RepairAsadOpeningBalanceError(
      `Target voucher is not ${legalEntityCode}`,
      "WRONG_LEGAL_ENTITY"
    )
  }

  if (entry.status !== "POSTED") {
    throw new RepairAsadOpeningBalanceError(
      `Target voucher must be POSTED (current: ${entry.status})`,
      "NOT_POSTED"
    )
  }

  if (!entry.postedJournalEntryId || !entry.postedVoucherId) {
    throw new RepairAsadOpeningBalanceError(
      "Target voucher is missing posted journal or voucher linkage",
      "MISSING_POSTED_LINKS"
    )
  }

  if (!entry.postedJournalEntry || !entry.postedVoucher) {
    throw new RepairAsadOpeningBalanceError(
      "Posted journal entry or voucher row is missing",
      "MISSING_POSTED_ROWS"
    )
  }

  if (entry.postedJournalEntry.legalEntityCode !== legalEntityCode) {
    throw new RepairAsadOpeningBalanceError(
      "Posted journal entry is not AD",
      "WRONG_JOURNAL_ENTITY"
    )
  }

  if (entry.postedVoucher.legalEntityCode !== legalEntityCode) {
    throw new RepairAsadOpeningBalanceError(
      "Posted voucher is not AD",
      "WRONG_VOUCHER_ENTITY"
    )
  }

  if (entry.postedJournalEntry.period.legalEntityCode !== legalEntityCode) {
    throw new RepairAsadOpeningBalanceError(
      "Posted journal period is not AD",
      "WRONG_PERIOD_ENTITY"
    )
  }

  assertJournalLinesBalance(entry.lines)

  return entry
}

function buildAudit(
  entry: RepairTargetRow,
  input: {
    newPeriodId: string
    newPeriodKey: string
    periodBootstrapped: boolean
    pdfCleared: boolean
  }
): RepairAsadOpeningBalanceAudit {
  const journal = entry.postedJournalEntry!
  const correctedDate = ASAD_OPENING_BALANCE_REPAIR_TARGET.correctedEntryDate

  return {
    entryId: entry.id,
    documentNo: entry.entryNo,
    legalEntityCode: entry.legalEntityCode,
    description: entry.description,
    status: entry.status,
    oldEntryDate: entry.entryDate.toISOString(),
    newEntryDate: correctedDate.toISOString(),
    oldPeriodKey: journal.period.periodKey,
    newPeriodKey: input.newPeriodKey,
    oldPeriodId: journal.periodId,
    newPeriodId: input.newPeriodId,
    postedJournalEntryId: entry.postedJournalEntryId!,
    postedVoucherId: entry.postedVoucherId!,
    pdfCleared: input.pdfCleared,
    periodBootstrapped: input.periodBootstrapped,
  }
}

export async function planRepairAsadOpeningBalanceMjv(
  tx: Prisma.TransactionClient = prisma
): Promise<RepairAsadOpeningBalanceAudit> {
  const entry = await loadRepairTarget(tx)
  const journal = entry.postedJournalEntry!
  const { targetPeriodKey, legalEntityCode, correctedEntryDate } =
    ASAD_OPENING_BALANCE_REPAIR_TARGET

  const existingTargetPeriod = await tx.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({ periodKey: targetPeriodKey, legalEntityCode }),
    select: { id: true, periodKey: true },
  })

  const alreadyCorrect =
    entry.entryDate.getTime() === correctedEntryDate.getTime() &&
    journal.period.periodKey === targetPeriodKey

  if (alreadyCorrect) {
    return buildAudit(entry, {
      newPeriodId: journal.periodId,
      newPeriodKey: targetPeriodKey,
      periodBootstrapped: false,
      pdfCleared: false,
    })
  }

  return buildAudit(entry, {
    newPeriodId: existingTargetPeriod?.id ?? "(bootstrap on execute)",
    newPeriodKey: targetPeriodKey,
    periodBootstrapped: !existingTargetPeriod,
    pdfCleared: Boolean(entry.pdfPath?.trim() || entry.pdfBlobUrl?.trim()),
  })
}

export type ExecuteRepairAsadOpeningBalanceResult = {
  audit: RepairAsadOpeningBalanceAudit
  pdfRegenerated: boolean
  pdfRegenerationError?: string
}

export async function executeRepairAsadOpeningBalanceMjv(input?: {
  regeneratePdf?: boolean
}): Promise<ExecuteRepairAsadOpeningBalanceResult> {
  const audit = await prisma.$transaction(async (tx) => {
    const entry = await loadRepairTarget(tx)
    const journal = entry.postedJournalEntry!
    const voucher = entry.postedVoucher!
    const { targetPeriodKey, legalEntityCode, correctedEntryDate } =
      ASAD_OPENING_BALANCE_REPAIR_TARGET

    const periodBefore = await tx.accountingPeriod.findUnique({
      where: accountingPeriodUniqueWhere({ periodKey: targetPeriodKey, legalEntityCode }),
      select: { id: true },
    })

    const targetPeriod = await bootstrapPeriodIfMissing(tx, {
      periodKey: targetPeriodKey,
      legalEntityCode,
      branchId: entry.branchId,
    })

    const hadPdf =
      Boolean(entry.pdfPath?.trim()) || Boolean(entry.pdfBlobUrl?.trim())

    await tx.manualJournalEntry.update({
      where: { id: entry.id },
      data: {
        entryDate: correctedEntryDate,
        pdfPath: null,
        pdfBlobUrl: null,
        pdfGeneratedAt: null,
      },
    })

    await tx.voucher.update({
      where: { id: voucher.id },
      data: {
        date: correctedEntryDate,
        periodId: targetPeriod.id,
      },
    })

    await tx.journalEntry.update({
      where: { id: journal.id },
      data: {
        date: correctedEntryDate,
        periodId: targetPeriod.id,
      },
    })

    return buildAudit(entry, {
      newPeriodId: targetPeriod.id,
      newPeriodKey: targetPeriod.periodKey,
      periodBootstrapped: !periodBefore,
      pdfCleared: hadPdf,
    })
  })

  let pdfRegenerated = false
  let pdfRegenerationError: string | undefined

  if (input?.regeneratePdf) {
    const pdfResult = await attachPdfFromPostedEntry(
      audit.entryId,
      ASAD_OPENING_BALANCE_REPAIR_TARGET.legalEntityCode
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

export function formatRepairAsadOpeningBalanceAudit(
  audit: RepairAsadOpeningBalanceAudit,
  label: "before" | "after"
): string {
  return [
    `[${label}] ASAD opening balance repair audit`,
    `  voucherId: ${audit.entryId}`,
    `  documentNo: ${audit.documentNo}`,
    `  legalEntityCode: ${audit.legalEntityCode}`,
    `  description: ${audit.description ?? "(none)"}`,
    `  status: ${audit.status}`,
    `  entryDate: ${label === "before" ? audit.oldEntryDate : audit.newEntryDate}`,
    `  periodKey: ${label === "before" ? audit.oldPeriodKey : audit.newPeriodKey}`,
    `  periodId: ${label === "before" ? audit.oldPeriodId : audit.newPeriodId}`,
    `  postedJournalEntryId: ${audit.postedJournalEntryId}`,
    `  postedVoucherId: ${audit.postedVoucherId}`,
    ...(label === "after"
      ? [
          `  periodBootstrapped: ${audit.periodBootstrapped}`,
          `  pdfCleared: ${audit.pdfCleared}`,
        ]
      : []),
  ].join("\n")
}
