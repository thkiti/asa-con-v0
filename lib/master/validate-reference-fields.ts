import { normalizeReferenceProductCode } from "@/lib/import/validation/product-code"
import { MasterDomainError } from "./errors"

export type ParsedReferenceFields = {
  hookGroup: string
  hookNo: number
  supplierCode: string
  productCode: string
  productGroup: string | null
}

export function parseHookGroup(value: unknown): string {
  const hookGroup = String(value ?? "").trim().toUpperCase()
  if (!hookGroup) {
    throw new MasterDomainError("Hook group is required", "HOOK_REQUIRED", 400)
  }
  return hookGroup
}

export function parseHookNo(value: unknown): number {
  const hookNo = Number(value)
  if (!Number.isFinite(hookNo) || hookNo <= 0 || !Number.isInteger(hookNo)) {
    throw new MasterDomainError("Hook number must be a positive integer", "HOOK_REQUIRED", 400)
  }
  return hookNo
}

export function parseSupplierCode(value: unknown, hookGroup: string): string {
  const supplierCode =
    hookGroup === "S"
      ? String(value ?? "-").trim() || "-"
      : String(value ?? "").trim().toUpperCase()
  if (!supplierCode) {
    throw new MasterDomainError("Supplier code is required", "VALIDATION_ERROR", 400)
  }
  return supplierCode
}

export function parseReferenceProductCode(value: unknown): string {
  const productCode = normalizeReferenceProductCode(value)
  if (!productCode) {
    throw new MasterDomainError("Reference product code is invalid", "PRODUCT_CODE_INVALID", 400)
  }
  return productCode
}

export function parseProductGroup(value: unknown): string | null {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null
  }
  const normalized = normalizeReferenceProductCode(value)
  return normalized || null
}

export function parseReferenceFields(body: Record<string, unknown>): ParsedReferenceFields {
  const hookGroup = parseHookGroup(body.hookGroup)
  const hookNo = parseHookNo(body.hookNo)
  const supplierCode = parseSupplierCode(body.supplierCode, hookGroup)
  const productCode = parseReferenceProductCode(body.productCode)
  const productGroup = parseProductGroup(body.productGroup)

  return { hookGroup, hookNo, supplierCode, productCode, productGroup }
}
