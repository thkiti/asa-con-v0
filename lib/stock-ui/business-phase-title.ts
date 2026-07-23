import type { DocStatus, DocType } from "@/generated/prisma/client"
import {
  formatEntityContextTitle,
  type DocumentEntityCode,
} from "@/lib/legal-entity"

/** Staff-facing business phase codes (MC-1F locked vocabulary). */
export type BusinessPhaseCode =
  | "ORD"
  | "ORS"
  | "ORI"
  | "DEY"
  | "CNT"
  | "ADJ"
  | "END"

export type DeriveBusinessPhaseInput = {
  docType: DocType
  status: DocStatus
  /** Session / viewer entity — drives acting-entity prefix and cross-entity titles. */
  viewerEntityCode: DocumentEntityCode
}

export type FormatStockDocumentPhaseTitleInput = DeriveBusinessPhaseInput

const ORD_STATUSES: ReadonlySet<DocStatus> = new Set(["DRAFT", "SUBMITTED"])
const ORI_RECEIVE_STATUSES: ReadonlySet<DocStatus> = new Set([
  "SHIPPED",
  "CONFIRMED",
  "RECEIVED",
  "POSTED",
  "TRANSFERRED",
])

function transferOutPhase(
  status: DocStatus,
  viewerEntityCode: DocumentEntityCode
): BusinessPhaseCode {
  if (viewerEntityCode === "AS") {
    if (ORD_STATUSES.has(status)) return "ORD"
    if (ORI_RECEIVE_STATUSES.has(status)) return "ORI"
    return "ORD"
  }

  // ASAD viewer
  if (status === "SHIPPED" || status === "SUBMITTED") return "DEY"
  if (ORI_RECEIVE_STATUSES.has(status)) return "ORI"
  if (status === "DRAFT") return "ORD"
  return "DEY"
}

function adjustmentPhase(status: DocStatus): BusinessPhaseCode {
  if (status === "DRAFT") return "CNT"
  return "ADJ"
}

function purchasePhase(status: DocStatus): BusinessPhaseCode {
  if (ORD_STATUSES.has(status)) return "ORD"
  if (status === "SHIPPED") return "ORS"
  return "ORI"
}

/**
 * Derive the staff-facing phase code from doc type, workflow status, and viewer entity.
 * Does not mutate workflow — display only.
 */
export function deriveBusinessPhaseCode(
  input: DeriveBusinessPhaseInput
): BusinessPhaseCode {
  const { docType, status, viewerEntityCode } = input

  switch (docType) {
    case "TRANSFER_OUT":
      return transferOutPhase(status, viewerEntityCode)
    case "ADJUSTMENT":
      return adjustmentPhase(status)
    case "PURCHASE":
      return purchasePhase(status)
    case "TRANSFER_IN":
      return "ORI"
    case "END":
      return "END"
    default:
      return "ORD"
  }
}

/** Entity prefix + phase code, e.g. ASAS • ORD */
export function formatStockDocumentPhaseTitle(
  input: FormatStockDocumentPhaseTitleInput
): string {
  const phaseCode = deriveBusinessPhaseCode(input)
  return formatEntityContextTitle(input.viewerEntityCode, phaseCode)
}

/** Whether a doc type should use vocabulary phase titles in staff UI. */
export function usesBusinessPhaseTitle(docType: DocType): boolean {
  return (
    docType === "TRANSFER_OUT" ||
    docType === "ADJUSTMENT" ||
    docType === "PURCHASE" ||
    docType === "TRANSFER_IN" ||
    docType === "END"
  )
}

/** Running ref body after legacy prefix: BRANCH-YYYYMM-SEQ */
const RUNNING_REF_SUFFIX = /^[A-Z0-9]+-\d{6}-\d{3,4}$/i

export type FormatBusinessDocumentNumberInput = DeriveBusinessPhaseInput & {
  /** Stored refNo from the database — never mutated. */
  storedRefNo: string | null | undefined
}

/**
 * Display refNo with the business phase prefix aligned to the page title.
 * Stored value is unchanged; presentation only.
 */
export function formatBusinessDocumentNumber(
  input: FormatBusinessDocumentNumberInput
): string {
  const stored = String(input.storedRefNo ?? "").trim()
  if (!stored) return stored

  if (!usesBusinessPhaseTitle(input.docType)) {
    return stored
  }

  const dashIndex = stored.indexOf("-")
  if (dashIndex <= 0) return stored

  const suffix = stored.slice(dashIndex + 1)
  if (!RUNNING_REF_SUFFIX.test(suffix)) {
    return stored
  }

  const phaseCode = deriveBusinessPhaseCode(input)
  return `${phaseCode}-${suffix}`
}
