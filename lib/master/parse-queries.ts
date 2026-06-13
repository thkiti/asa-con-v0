import { BranchType } from "@/lib/shared"
import { Role } from "@/lib/shared"
import type {
  BranchListQuery,
  ListMode,
  ProductReferenceListQuery,
  ReferenceStatusFilter,
  StaffListQuery,
} from "./types"

const VALID_ROLES = new Set<string>(Object.values(Role))

function parseMode(value: string | null): ListMode {
  return value === "trash" ? "trash" : "active"
}

function trimParam(value: string | null): string {
  return String(value ?? "").trim()
}

const VALID_BRANCH_TYPES = new Set<string>([BranchType.HO, BranchType.SH])

function parseBranchType(value: string | null): string {
  const raw = trimParam(value).toUpperCase()
  return VALID_BRANCH_TYPES.has(raw) ? raw : ""
}

function parseActiveOnly(value: string | null): boolean {
  const raw = trimParam(value).toLowerCase()
  return raw === "1" || raw === "true" || raw === "yes"
}

export function parseBranchListQuery(
  searchParams: URLSearchParams
): BranchListQuery {
  return {
    mode: parseMode(searchParams.get("mode")),
    code: trimParam(searchParams.get("code")),
    name: trimParam(searchParams.get("name")),
    type: parseBranchType(searchParams.get("type")),
    activeOnly: parseActiveOnly(searchParams.get("activeOnly")),
  }
}

export function parseStaffListQuery(searchParams: URLSearchParams): StaffListQuery {
  const roleRaw = trimParam(searchParams.get("role"))
  const role = VALID_ROLES.has(roleRaw) ? (roleRaw as Role) : null

  return {
    mode: parseMode(searchParams.get("mode")),
    staffId: trimParam(searchParams.get("staffId")),
    name: trimParam(searchParams.get("name")),
    role,
    branchCode: trimParam(searchParams.get("branchCode")),
  }
}

function parseReferenceStatus(value: string | null): ReferenceStatusFilter {
  const raw = trimParam(value).toLowerCase()
  if (raw === "has" || raw === "none") return raw
  return "all"
}

export function parseProductReferenceListQuery(
  searchParams: URLSearchParams
): ProductReferenceListQuery {
  return {
    mode: parseMode(searchParams.get("mode")),
    productCode: trimParam(searchParams.get("productCode")),
    productName: trimParam(searchParams.get("productName")),
    hookGroup: trimParam(searchParams.get("hookGroup")),
    hookNo: trimParam(searchParams.get("hookNo")),
    supplierCode: trimParam(searchParams.get("supplierCode")),
    productGroup: trimParam(searchParams.get("productGroup")),
    referenceStatus: parseReferenceStatus(searchParams.get("referenceStatus")),
  }
}
