import { MasterDomainError } from "./errors"
import { parseReferenceFields } from "./validate-reference-fields"

export type CreateReferenceStockInput = {
  productId: string
} & import("./validate-reference-fields").ParsedReferenceFields

export type UpdateReferenceStockInput = import("./validate-reference-fields").ParsedReferenceFields

export type PatchReferenceStockBody =
  | { action: "update" } & UpdateReferenceStockInput
  | { action: "delete" }

function rejectImmutableReferenceFields(body: Record<string, unknown>): void {
  if ("productId" in body && body.productId !== undefined) {
    throw new MasterDomainError(
      "Reference product cannot be changed after creation",
      "PRODUCT_ID_IMMUTABLE",
      400
    )
  }
}

function parseProductId(value: unknown): string {
  const productId = String(value ?? "").trim()
  if (!productId) {
    throw new MasterDomainError("Product is required", "VALIDATION_ERROR", 400)
  }
  return productId
}

export function parseCreateReferenceStockBody(body: unknown): CreateReferenceStockInput {
  if (!body || typeof body !== "object") {
    throw new MasterDomainError("Invalid request body", "VALIDATION_ERROR", 400)
  }
  const record = body as Record<string, unknown>
  const productId = parseProductId(record.productId)
  const fields = parseReferenceFields(record)

  return { productId, ...fields }
}

export function parsePatchReferenceStockBody(body: unknown): PatchReferenceStockBody {
  if (!body || typeof body !== "object") {
    throw new MasterDomainError("Invalid request body", "VALIDATION_ERROR", 400)
  }
  const record = body as Record<string, unknown>
  rejectImmutableReferenceFields(record)

  if (record.deleted === true) {
    return { action: "delete" }
  }
  if (record.deleted === false) {
    throw new MasterDomainError(
      "Reference links are hard-deleted and cannot be restored; create a new reference instead",
      "REFERENCE_RESTORE_UNSUPPORTED",
      400
    )
  }

  const fields = parseReferenceFields(record)
  return { action: "update", ...fields }
}
