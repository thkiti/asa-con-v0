/**
 * Entity-aware Stock Document list / create policy (client-safe).
 * ASAD = HO999 inventory owner; ASAS = Shop workflows.
 * DEY (TRANSFER_OUT from HO) is ASAD-owned; Destination Shop is not ASAD location scope.
 */
import type { DocType } from "@/generated/prisma/client"
import {
  HO_BRANCH_CODE,
  type DocumentEntityCode,
} from "@/lib/legal-entity/constants"

/** Staff-facing kind filter values (not Prisma DocType). */
export type StockDocumentKindFilter =
  | ""
  | "ORD"
  | "DEY"
  | "CNT"
  | "ADJ"
  | "END"
  | "PER"

export type StockDocumentLocationMode = "ho_location" | "shop"

export type StockDocumentKindOption = {
  value: StockDocumentKindFilter
  label: string
}

const ASAD_KIND_OPTIONS: readonly StockDocumentKindOption[] = [
  { value: "", label: "All" },
  { value: "CNT", label: "CNT • ตรวจนับสินค้า" },
  { value: "DEY", label: "DEY • ส่งของ" },
  { value: "END", label: "END • สต็อกสิ้นงวด" },
]

const ASAS_KIND_OPTIONS: readonly StockDocumentKindOption[] = [
  { value: "", label: "All" },
  { value: "ORD", label: "ORD • ใบสั่งของ" },
  { value: "CNT", label: "CNT • ตรวจนับสินค้า" },
  { value: "ADJ", label: "ADJ • ปรับปรุง" },
  { value: "PER", label: "PER • Performance" },
  { value: "END", label: "END • สต็อกสิ้นงวด" },
]

/** Prisma DocTypes allowed in ASAD list / create scope. */
export const ASAD_ALLOWED_DOC_TYPES: readonly DocType[] = [
  "ADJUSTMENT",
  "TRANSFER_OUT",
  "END",
] as const

/** Prisma DocTypes allowed in ASAS list / create scope. */
export const ASAS_ALLOWED_DOC_TYPES: readonly DocType[] = [
  "TRANSFER_OUT",
  "ADJUSTMENT",
  "PERFORMANCE",
  "END",
] as const

export function isDocumentEntityCode(
  value: string | null | undefined
): value is DocumentEntityCode {
  const v = String(value ?? "").trim().toUpperCase()
  return v === "AS" || v === "AD"
}

export function getStockDocumentLocationMode(
  entityCode: DocumentEntityCode
): StockDocumentLocationMode {
  return entityCode === "AD" ? "ho_location" : "shop"
}

export function getStockDocumentLocationFilterLabel(
  entityCode: DocumentEntityCode
): string {
  return entityCode === "AD" ? "Location" : "Shop"
}

export function getStockDocumentWorkflowContextLabel(
  entityCode: DocumentEntityCode
): string {
  return entityCode === "AD" ? "CNT • DEY • END" : "ORD • CNT • ADJ • PER • END"
}

export function getStockDocumentTypesForEntity(
  entityCode: DocumentEntityCode
): readonly StockDocumentKindOption[] {
  return entityCode === "AD" ? ASAD_KIND_OPTIONS : ASAS_KIND_OPTIONS
}

export function getAllowedDocTypesForEntity(
  entityCode: DocumentEntityCode
): readonly DocType[] {
  return entityCode === "AD" ? ASAD_ALLOWED_DOC_TYPES : ASAS_ALLOWED_DOC_TYPES
}

export function isStockDocumentKindAllowedForEntity(
  entityCode: DocumentEntityCode,
  kind: StockDocumentKindFilter
): boolean {
  if (!kind) return true
  return getStockDocumentTypesForEntity(entityCode).some((o) => o.value === kind)
}

export function isStockDocumentTypeAllowedForEntity(
  entityCode: DocumentEntityCode,
  docType: DocType
): boolean {
  return (getAllowedDocTypesForEntity(entityCode) as readonly string[]).includes(
    docType
  )
}

/**
 * Map UI kind → Prisma list filters.
 * DEY and ORD both use TRANSFER_OUT; ownership is enforced by branch/fromLoc scope on the server.
 */
export function stockDocumentKindToListQuery(
  kind: StockDocumentKindFilter,
  status: string
): { docType?: DocType; status?: string } {
  switch (kind) {
    case "ORD":
    case "DEY":
      return {
        docType: "TRANSFER_OUT",
        ...(status ? { status } : {}),
      }
    case "CNT":
      return {
        docType: "ADJUSTMENT",
        status: status || "DRAFT",
      }
    case "ADJ":
      return {
        docType: "ADJUSTMENT",
        ...(status ? { status } : {}),
      }
    case "PER":
      return {
        docType: "PERFORMANCE",
        ...(status ? { status } : {}),
      }
    case "END":
      return {
        docType: "END",
        ...(status ? { status } : {}),
      }
    default:
      return status ? { status } : {}
  }
}

export function matchesStockDocumentKindFilter(
  kind: StockDocumentKindFilter,
  status: string,
  row: { docType: DocType; status: string }
): boolean {
  if (kind === "ORD" || kind === "DEY") {
    return row.docType === "TRANSFER_OUT"
  }
  if (kind === "CNT") {
    if (row.docType !== "ADJUSTMENT") return false
    return status ? row.status === status : row.status === "DRAFT"
  }
  if (kind === "ADJ") {
    if (row.docType !== "ADJUSTMENT") return false
    if (status) return row.status === status
    return row.status !== "DRAFT"
  }
  if (kind === "PER") {
    return row.docType === "PERFORMANCE"
  }
  if (kind === "END") {
    return row.docType === "END"
  }
  return true
}

export function allowsAllShopsFilter(entityCode: DocumentEntityCode): boolean {
  return entityCode === "AS"
}

export function requiresSpecificShopForEnd(
  entityCode: DocumentEntityCode
): boolean {
  return entityCode === "AS"
}

export function resolveEndBranchCodeForEntity(
  entityCode: DocumentEntityCode
): string | null {
  return entityCode === "AD" ? HO_BRANCH_CODE : null
}

export type BranchScopeOption = {
  id: string
  code: string
  name: string
  type?: "HO" | "SH"
}

/** Filter branch options for the entity location/shop dropdown. */
export function filterBranchesForEntityScope(
  entityCode: DocumentEntityCode,
  branches: readonly BranchScopeOption[],
  hoBranch?: BranchScopeOption | null
): BranchScopeOption[] {
  if (entityCode === "AD") {
    if (hoBranch) return [hoBranch]
    const found = branches.find(
      (b) => b.code.trim().toUpperCase() === HO_BRANCH_CODE || b.type === "HO"
    )
    return found ? [found] : []
  }
  return branches.filter(
    (b) =>
      b.type === "SH" ||
      (b.type == null && b.code.trim().toUpperCase() !== HO_BRANCH_CODE)
  )
}

export function normalizeFiltersForEntity(
  entityCode: DocumentEntityCode,
  filters: {
    shopBranchId: string
    docKind: StockDocumentKindFilter
  },
  opts: {
    hoBranchId: string | null
    shopOptionIds: ReadonlySet<string>
  }
): { shopBranchId: string; docKind: StockDocumentKindFilter; changed: boolean } {
  let shopBranchId = filters.shopBranchId
  let docKind = filters.docKind
  let changed = false

  if (entityCode === "AD") {
    if (opts.hoBranchId && shopBranchId !== opts.hoBranchId) {
      shopBranchId = opts.hoBranchId
      changed = true
    }
  } else if (shopBranchId && !opts.shopOptionIds.has(shopBranchId)) {
    shopBranchId = ""
    changed = true
  }

  if (!isStockDocumentKindAllowedForEntity(entityCode, docKind)) {
    docKind = ""
    changed = true
  }

  return { shopBranchId, docKind, changed }
}

export function assertEntityBranchCombination(input: {
  legalEntityCode: DocumentEntityCode
  branchCode: string
  branchType?: "HO" | "SH" | string | null
}): void {
  const code = input.branchCode.trim().toUpperCase()
  const type = String(input.branchType ?? "").trim().toUpperCase()

  if (input.legalEntityCode === "AD") {
    if (code !== HO_BRANCH_CODE && type !== "HO") {
      throw new Error("ASAD Stock Documents only allow location HO999")
    }
    return
  }

  if (code === HO_BRANCH_CODE || type === "HO") {
    throw new Error("ASAS Stock Documents do not allow HO999 as Shop")
  }
}
