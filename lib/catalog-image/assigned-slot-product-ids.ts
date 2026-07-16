import { assignCatalogSlotProductCodes } from "./assign-slot-codes"
import type { AssignedCatalogSlot } from "./assign-slot-codes"
import { CatalogImageError } from "./errors"
import { normalizeCatalogProductCode } from "./normalize-catalog-code"

/**
 * Resolve an editable slot Product ID to a canonical product code.
 * - Empty → caller decides (often treated as SKIP)
 * - Exactly 7 digits → treat as already-canonical product code (do not strip checksum)
 * - Otherwise → normalize as a catalog scan / barcode code
 */
export function resolveAssignedSlotProductCode(rawProductId: string): string {
  const trimmed = String(rawProductId ?? "").trim()
  if (!trimmed) {
    throw new CatalogImageError(
      "Product ID is required",
      "VALIDATION_ERROR",
      400
    )
  }

  if (/^\d{7}$/.test(trimmed)) {
    return trimmed
  }

  return normalizeCatalogProductCode(trimmed)
}

export function updateAssignedSlotProductId(
  slots: AssignedCatalogSlot[],
  sourceSlot: number,
  rawProductId: string
): AssignedCatalogSlot[] {
  return slots.map((slot) => {
    if (slot.sourceSlot !== sourceSlot) return slot

    const productCode = rawProductId
    const trimmed = rawProductId.trim()
    if (!trimmed) {
      return {
        ...slot,
        productCode,
        finalFileName: "",
      }
    }

    try {
      const resolved = resolveAssignedSlotProductCode(rawProductId)
      return {
        ...slot,
        productCode,
        finalFileName: `${resolved}.png`,
      }
    } catch {
      return {
        ...slot,
        productCode,
        finalFileName: `${trimmed}.png`,
      }
    }
  })
}

export type AssignedSlotValidationIssue = {
  sourceSlot: number
  reason: "invalid" | "duplicate"
}

export type AssignedSlotValidationResult =
  | { ok: true }
  | {
      ok: false
      issues: AssignedSlotValidationIssue[]
      message: string
    }

function formatSlotList(slots: number[]): string {
  if (slots.length === 1) return `Slot ${slots[0]}`
  if (slots.length === 2) return `Slots ${slots[0]} and ${slots[1]}`
  const head = slots.slice(0, -1).join(", ")
  return `Slots ${head}, and ${slots[slots.length - 1]}`
}

export function validateAssignedSlotProductIds(
  slots: AssignedCatalogSlot[]
): AssignedSlotValidationResult {
  const issues: AssignedSlotValidationIssue[] = []
  const resolvedBySlot = new Map<number, string>()
  let activeCount = 0

  for (const slot of slots) {
    const trimmed = String(slot.productCode ?? "").trim()
    if (!trimmed) {
      continue
    }
    activeCount += 1

    try {
      resolvedBySlot.set(
        slot.sourceSlot,
        resolveAssignedSlotProductCode(slot.productCode)
      )
    } catch {
      issues.push({ sourceSlot: slot.sourceSlot, reason: "invalid" })
    }
  }

  if (activeCount === 0) {
    return {
      ok: false,
      issues: [],
      message: "กรุณากำหนด Product ID อย่างน้อย 1 Slot",
    }
  }

  const codeToSlots = new Map<string, number[]>()
  for (const [sourceSlot, code] of resolvedBySlot) {
    const list = codeToSlots.get(code) ?? []
    list.push(sourceSlot)
    codeToSlots.set(code, list)
  }

  for (const [, slotNumbers] of codeToSlots) {
    if (slotNumbers.length < 2) continue
    for (const sourceSlot of slotNumbers) {
      issues.push({ sourceSlot, reason: "duplicate" })
    }
  }

  if (issues.length === 0) {
    return { ok: true }
  }

  const invalidSlots = issues
    .filter((issue) => issue.reason === "invalid")
    .map((issue) => issue.sourceSlot)
  if (invalidSlots.length > 0) {
    return {
      ok: false,
      issues,
      message:
        invalidSlots.length === 1
          ? `Slot ${invalidSlots[0]} has an invalid Product ID`
          : `${formatSlotList(invalidSlots)} have invalid Product IDs`,
    }
  }

  const duplicateSlots = [
    ...new Set(
      issues
        .filter((issue) => issue.reason === "duplicate")
        .map((issue) => issue.sourceSlot)
    ),
  ].sort((a, b) => a - b)

  let duplicateCode = ""
  for (const [code, slotNumbers] of codeToSlots) {
    if (slotNumbers.length > 1) {
      duplicateCode = code
      break
    }
  }

  return {
    ok: false,
    issues,
    message: `${formatSlotList(duplicateSlots)} have duplicate Product ID ${duplicateCode}`,
  }
}

/** True when any slot Product ID differs from sequential auto-assign for the same count. */
export function hasManualAssignedSlotEdits(
  slots: AssignedCatalogSlot[],
  startingProductId: string
): boolean {
  if (slots.length === 0) return false

  let expected: AssignedCatalogSlot[]
  try {
    expected = assignCatalogSlotProductCodes(startingProductId, slots.length)
  } catch {
    return true
  }

  return slots.some((slot, index) => {
    const expectedSlot = expected[index]
    if (!expectedSlot || slot.sourceSlot !== expectedSlot.sourceSlot) {
      return true
    }

    const trimmed = String(slot.productCode ?? "").trim()
    if (!trimmed) {
      return true
    }

    try {
      const resolved = resolveAssignedSlotProductCode(slot.productCode)
      return resolved !== expectedSlot.productCode
    } catch {
      return true
    }
  })
}

export function resolveAssignedSlotsForSave(
  slots: AssignedCatalogSlot[]
): AssignedCatalogSlot[] {
  return slots
    .filter((slot) => String(slot.productCode ?? "").trim().length > 0)
    .map((slot) => {
      const productCode = resolveAssignedSlotProductCode(slot.productCode)
      return {
        sourceSlot: slot.sourceSlot,
        productCode,
        finalFileName: `${productCode}.png`,
      }
    })
}
