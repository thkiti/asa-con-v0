import type { DocType } from "./types"
import type { StockDocumentActionId, StockDocumentActionVM } from "./types"
import type { StockDocumentEditorStateVM } from "./editor-types"
import {
  deriveBusinessPhaseCode,
  formatBusinessDocumentNumber,
  type BusinessPhaseCode,
  type DeriveBusinessPhaseInput,
} from "./business-phase-title"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"

/** Query param value when entering the editor from FULL POS → STOCK COUNT. */
export const STOCK_COUNT_STAFF_FROM = "shop"

export const STOCK_COUNT_STAFF_BACK_HREF = "/shop"

const STAFF_TOOLBAR_ACTION_IDS: ReadonlySet<StockDocumentActionId> = new Set([
  "save",
  "submit",
])

export function isStockCountStaffEntry(from: string | null | undefined): boolean {
  return String(from ?? "").trim() === STOCK_COUNT_STAFF_FROM
}

const STAFF_OPERATIONAL_SHEET_DOC_TYPES: ReadonlySet<DocType> = new Set([
  "ADJUSTMENT",
  "TRANSFER_OUT",
])

/** Staff POS entry: counting-sheet layout for shop count (ADJ) and order (TRANSFER_OUT) drafts. */
export function isStaffOperationalSheet(
  state: StockDocumentEditorStateVM,
  staffEntry: boolean
): boolean {
  if (!staffEntry || state.readOnly || state.status !== "DRAFT") return false
  return STAFF_OPERATIONAL_SHEET_DOC_TYPES.has(state.docType)
}

export function filterEditorActionsForStockCountStaff(
  actions: StockDocumentActionVM[]
): StockDocumentActionVM[] {
  return actions.filter((action) => STAFF_TOOLBAR_ACTION_IDS.has(action.id))
}

export type StockCountStaffHeadingFields = {
  /** Stored refNo from database / editor state — never pre-formatted. */
  refNo: string | null
  branchCode: string
  branchName: string
  staffCode: string
  staffName: string
  documentDate: string
}

/** Business-facing ref for staff operational sheet identity lines. */
export function formatStaffOperationalSheetRefNo(
  phase: DeriveBusinessPhaseInput,
  storedRefNo: string | null | undefined
): string {
  return formatBusinessDocumentNumber({
    ...phase,
    storedRefNo,
  })
}

/** Canonical separator for operational-sheet identity headings. */
export const OPERATIONAL_HEADING_SEGMENT_SEP = " • "

const OPERATIONAL_SHEET_PURPOSE_LABELS: Partial<Record<BusinessPhaseCode, string>> = {
  CNT: "ตรวจนับสต๊อก",
  ORD: "ใบสั่งของ",
}

function staffOperationalPurposeLabel(phase: DeriveBusinessPhaseInput): string {
  const code = deriveBusinessPhaseCode(phase)
  return OPERATIONAL_SHEET_PURPOSE_LABELS[code] ?? code
}

function joinOperationalHeadingSegments(segments: readonly string[]): string {
  return segments.filter((segment) => segment.length > 0).join(OPERATIONAL_HEADING_SEGMENT_SEP)
}

/** One-line staff operational sheet title with branch, staff, and date metadata. */
export function buildStaffOperationalHeadingLine(
  fields: StockCountStaffHeadingFields,
  phase: DeriveBusinessPhaseInput
): string {
  const refLabel =
    formatStaffOperationalSheetRefNo(phase, fields.refNo).trim() || "—"
  const formattedDate = formatStockCountStaffDate(fields.documentDate)
  const purpose = staffOperationalPurposeLabel(phase)

  return joinOperationalHeadingSegments([
    purpose,
    refLabel,
    fields.branchCode,
    fields.branchName,
    fields.staffCode,
    fields.staffName,
    formattedDate,
  ])
}

/** One-line staff counting sheet title with branch, staff, and date metadata. */
export function buildStockCountStaffHeadingLine(
  fields: StockCountStaffHeadingFields,
  phase?: Partial<DeriveBusinessPhaseInput>
): string {
  return buildStaffOperationalHeadingLine(fields, {
    docType: "ADJUSTMENT",
    status: "DRAFT",
    viewerEntityCode: DEFAULT_DOCUMENT_ENTITY_CODE,
    ...phase,
  })
}

/** Display date as YYYY.MM.DD for the staff counting sheet heading. */
export function formatStockCountStaffDate(date: string): string {
  const trimmed = String(date ?? "").trim()
  if (!trimmed) return ""

  const isoDate = trimmed.includes("T") ? trimmed.slice(0, 10) : trimmed
  const [year, month, day] = isoDate.split("-")
  if (!year || !month || !day) return trimmed

  return `${year}.${month}.${day}`
}
