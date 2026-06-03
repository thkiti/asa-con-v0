import { ProductType } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"

const PRODUCT_TYPES = new Set<string>([ProductType.TRACKED, ProductType.CONSUMABLE])

function rejectImmutableProductFields(body: Record<string, unknown>): void {
  for (const key of ["code", "groupCode", "typeCode", "runningCode"] as const) {
    if (key in body && body[key] !== undefined) {
      throw new MasterDomainError(
        "Product code cannot be changed after creation",
        "PRODUCT_CODE_IMMUTABLE",
        400
      )
    }
  }
}

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

export type UpdateProductInput = {
  name: string
  productType: ProductType
}

export type PatchProductBody =
  | { action: "update"; name: string; productType: ProductType }
  | { action: "delete" }
  | { action: "restore" }

export function parsePatchProductBody(body: unknown): PatchProductBody {
  if (!body || typeof body !== "object") {
    throw new MasterDomainError("Invalid request body", "VALIDATION_ERROR", 400)
  }
  const record = body as Record<string, unknown>
  rejectImmutableProductFields(record)

  if (record.deleted === true) {
    return { action: "delete" }
  }
  if (record.deleted === false) {
    return { action: "restore" }
  }

  const name = String(record.name ?? "").trim()
  if (!name) {
    throw new MasterDomainError("Product name is required", "VALIDATION_ERROR", 400)
  }

  if (record.productType === undefined) {
    throw new MasterDomainError("Product type is required for update", "VALIDATION_ERROR", 400)
  }

  return {
    action: "update",
    name,
    productType: parseProductType(record.productType),
  }
}
