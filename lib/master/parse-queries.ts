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

export function parseBranchListQuery(
  searchParams: URLSearchParams
): BranchListQuery {
  return {
    mode: parseMode(searchParams.get("mode")),
    q: trimParam(searchParams.get("q")),
  }
}

export function parseStaffListQuery(searchParams: URLSearchParams): StaffListQuery {
  const roleRaw = trimParam(searchParams.get("role"))
  const role = VALID_ROLES.has(roleRaw) ? (roleRaw as Role) : null

  return {
    mode: parseMode(searchParams.get("mode")),
    q: trimParam(searchParams.get("q")),
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
