import type { PrismaClient, ReceiptPrintSettings, ThermalDocumentType } from "@/generated/prisma/client"
import { DEFAULT_THERMAL_LAYOUTS } from "./layout-defaults"
import type { ThermalDocumentLayoutView } from "./types"

export const THERMAL_DOCUMENT_TYPES: ThermalDocumentType[] = [
  "RECEIPT",
  "REFUND",
  "COLLECTOR",
  "REPAIR_TICKET",
  "READ_Z",
]

const RECEIPT_PRINT_SETTINGS_ID = "default"

type BackfillDb = Pick<PrismaClient, "thermalDocumentLayout" | "receiptPrintSettings">

export type ThermalLayoutBackfillResult = {
  receiptCopiedFromLegacy: boolean
  created: ThermalDocumentType[]
  total: number
  missing: ThermalDocumentType[]
  ok: boolean
}

function layoutFieldsFromView(view: ThermalDocumentLayoutView) {
  return {
    headerLine1: view.headerLine1,
    headerLine2: view.headerLine2,
    headerLine3: view.headerLine3,
    footerLine1: view.footerLine1,
    footerLine2: view.footerLine2,
    footerLine3: view.footerLine3,
    footerLine4: view.footerLine4,
    footerLine5: view.footerLine5,
    showAbbreviatedTaxTitle: view.showAbbreviatedTaxTitle,
    showVatIncludedMessage: view.showVatIncludedMessage,
  }
}

function receiptLayoutFromLegacy(settings: ReceiptPrintSettings) {
  return {
    headerLine1: settings.companyDisplayName?.trim() || null,
    headerLine2: null,
    headerLine3: null,
    footerLine1: settings.footerLine1?.trim() || null,
    footerLine2: settings.footerLine2?.trim() || null,
    footerLine3: settings.footerLine3?.trim() || null,
    footerLine4: settings.footerLine4?.trim() || null,
    footerLine5: settings.footerLine5?.trim() || null,
    showAbbreviatedTaxTitle: settings.showAbbreviatedTaxTitle,
    showVatIncludedMessage: settings.showVatIncludedMessage,
  }
}

function receiptNeedsLegacyCopy(
  existing: {
    headerLine1: string | null
    footerLine1: string | null
    footerLine2: string | null
    footerLine3: string | null
    footerLine4: string | null
    footerLine5: string | null
  } | null,
  legacy: ReceiptPrintSettings | null
): boolean {
  if (!legacy) return false
  if (!existing) return true

  const legacyHasContent =
    Boolean(legacy.companyDisplayName?.trim()) ||
    Boolean(legacy.footerLine1?.trim()) ||
    Boolean(legacy.footerLine2?.trim()) ||
    Boolean(legacy.footerLine3?.trim()) ||
    Boolean(legacy.footerLine4?.trim()) ||
    Boolean(legacy.footerLine5?.trim())

  if (!legacyHasContent) return false

  const existingHasContent =
    Boolean(existing.headerLine1?.trim()) ||
    Boolean(existing.footerLine1?.trim()) ||
    Boolean(existing.footerLine2?.trim()) ||
    Boolean(existing.footerLine3?.trim()) ||
    Boolean(existing.footerLine4?.trim()) ||
    Boolean(existing.footerLine5?.trim())

  return !existingHasContent
}

export async function verifyThermalDocumentLayoutsSeeded(
  db: Pick<PrismaClient, "thermalDocumentLayout">
): Promise<{ ok: boolean; missing: ThermalDocumentType[]; count: number }> {
  const rows = await db.thermalDocumentLayout.findMany({
    select: { documentType: true },
  })
  const present = new Set(rows.map((row) => row.documentType))
  const missing = THERMAL_DOCUMENT_TYPES.filter((type) => !present.has(type))
  return { ok: missing.length === 0, missing, count: rows.length }
}

/**
 * Idempotent backfill for migrate-deploy and db-push workflows.
 * Copies ReceiptPrintSettings → RECEIPT when legacy has content and RECEIPT is missing/empty.
 */
export async function backfillThermalDocumentLayouts(
  db: BackfillDb
): Promise<ThermalLayoutBackfillResult> {
  const created: ThermalDocumentType[] = []
  let receiptCopiedFromLegacy = false

  const legacy = await db.receiptPrintSettings.findUnique({
    where: { id: RECEIPT_PRINT_SETTINGS_ID },
  })

  const existingReceipt = await db.thermalDocumentLayout.findUnique({
    where: { documentType: "RECEIPT" },
  })

  if (!existingReceipt) {
    const payload = legacy
      ? receiptLayoutFromLegacy(legacy)
      : layoutFieldsFromView(DEFAULT_THERMAL_LAYOUTS.RECEIPT)
    await db.thermalDocumentLayout.create({
      data: {
        documentType: "RECEIPT",
        ...payload,
      },
    })
    created.push("RECEIPT")
    if (legacy) receiptCopiedFromLegacy = true
  } else if (receiptNeedsLegacyCopy(existingReceipt, legacy)) {
    await db.thermalDocumentLayout.update({
      where: { documentType: "RECEIPT" },
      data: receiptLayoutFromLegacy(legacy!),
    })
    receiptCopiedFromLegacy = true
  }

  for (const documentType of THERMAL_DOCUMENT_TYPES) {
    if (documentType === "RECEIPT") continue

    const exists = await db.thermalDocumentLayout.findUnique({
      where: { documentType },
      select: { documentType: true },
    })
    if (exists) continue

    await db.thermalDocumentLayout.create({
      data: {
        documentType,
        ...layoutFieldsFromView(DEFAULT_THERMAL_LAYOUTS[documentType]),
      },
    })
    created.push(documentType)
  }

  const verification = await verifyThermalDocumentLayoutsSeeded(db)
  return {
    receiptCopiedFromLegacy,
    created,
    total: verification.count,
    missing: verification.missing,
    ok: verification.ok,
  }
}
