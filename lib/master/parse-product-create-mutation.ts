import { ProductType } from "@/generated/prisma/client"
import { normalizePosinyProductCode } from "@/lib/import/validation/product-code"
import { MasterDomainError } from "./errors"
import {
  parseHookGroup,
  parseHookNo,
  parseProductGroup,
  parseSupplierCode,
} from "./validate-reference-fields"

const PRODUCT_TYPES = new Set<string>([ProductType.TRACKED, ProductType.CONSUMABLE])

function parseProductType(value: unknown): ProductType {
  const raw = String(value ?? "").trim().toUpperCase()
  if (!PRODUCT_TYPES.has(raw)) {
    throw new MasterDomainError(
      "Product type must be TRACKED or CONSUMABLE",
      "VALIDATION_ERROR",
      400
    )
  }
  return raw as ProductType
}

export type CreateProductWithReferenceInput = {
  name: string
  productType: ProductType
  productCode: string
  groupCode: number
  typeCode: number
  runningCode: number
  hookGroup: string
  hookNo: number
  supplierCode: string
  productGroup: string | null
}

export function parseCreateProductWithReferenceBody(
  body: unknown
): CreateProductWithReferenceInput {
  if (!body || typeof body !== "object") {
    throw new MasterDomainError("Invalid request body", "VALIDATION_ERROR", 400)
  }

  const record = body as Record<string, unknown>
  const parts = normalizePosinyProductCode(record.productCode)
  if (!parts) {
    throw new MasterDomainError(
      "Product code must be a valid 7-digit product code",
      "PRODUCT_CODE_INVALID",
      400
    )
  }

  const name = String(record.name ?? "").trim()
  if (!name) {
    throw new MasterDomainError("Product name is required", "VALIDATION_ERROR", 400)
  }

  if (record.productType === undefined) {
    throw new MasterDomainError("Product type is required", "VALIDATION_ERROR", 400)
  }

  const hookGroup = parseHookGroup(record.hookGroup)
  const hookNo = parseHookNo(record.hookNo)
  const supplierCode = parseSupplierCode(record.supplierCode, hookGroup)
  const productGroup = parseProductGroup(record.productGroup)

  return {
    name,
    productType: parseProductType(record.productType),
    productCode: parts.code,
    groupCode: parts.groupCode,
    typeCode: parts.typeCode,
    runningCode: parts.runningCode,
    hookGroup,
    hookNo,
    supplierCode,
    productGroup,
  }
}
