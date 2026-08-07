import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"

type UniquenessDb = {
  referenceStock: Pick<PrismaClient["referenceStock"], "findFirst" | "findMany">
}

/**
 * Comparison key for supplier uniqueness.
 * Trim + uppercase, then strip spaces and periods so K.338 / K338 / K. 338 collide.
 * Does not rewrite the stored display value.
 */
export function canonicalSupplierCode(value: string): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s.]+/g, "")
}

/** Group S shared placeholder — exempt from supplier uniqueness. */
export function isSharedSupplierPlaceholder(supplierCode: string): boolean {
  return String(supplierCode ?? "").trim() === "-"
}

export async function assertActiveHookAvailable(
  db: UniquenessDb,
  input: {
    hookGroup: string
    hookNo: number
    productId: string
    excludeReferenceId?: string
  }
): Promise<void> {
  const conflict = await db.referenceStock.findFirst({
    where: {
      deleted: false,
      hookGroup: input.hookGroup,
      hookNo: input.hookNo,
      ...(input.excludeReferenceId
        ? { id: { not: input.excludeReferenceId } }
        : {}),
      product: { deleted: false },
    },
    select: {
      id: true,
      productId: true,
      product: { select: { code: true } },
    },
  })

  if (!conflict) return

  if (conflict.productId === input.productId) {
    throw new MasterDomainError(
      `Reference hook already exists for this product: ${input.hookGroup}.${input.hookNo}`,
      "HOOK_DUPLICATE",
      409
    )
  }

  const ownerCode = conflict.product.code
  throw new MasterDomainError(
    `Hook ${input.hookGroup}.${input.hookNo} is already assigned to product ${ownerCode}`,
    "HOOK_ALREADY_ASSIGNED",
    409
  )
}

export async function assertActiveSupplierAvailable(
  db: UniquenessDb,
  input: {
    supplierCode: string
    productId: string
    excludeReferenceId?: string
  }
): Promise<void> {
  if (isSharedSupplierPlaceholder(input.supplierCode)) return

  const canon = canonicalSupplierCode(input.supplierCode)
  if (!canon) return

  const candidates = await db.referenceStock.findMany({
    where: {
      deleted: false,
      NOT: { supplierCode: "-" },
      productId: { not: input.productId },
      ...(input.excludeReferenceId
        ? { id: { not: input.excludeReferenceId } }
        : {}),
      product: { deleted: false },
    },
    select: {
      supplierCode: true,
      product: { select: { code: true } },
    },
  })

  const hit = candidates.find(
    (row) => canonicalSupplierCode(row.supplierCode) === canon
  )
  if (!hit) return

  throw new MasterDomainError(
    `Supplier code ${input.supplierCode} is already assigned to product ${hit.product.code}`,
    "SUPPLIER_CODE_ALREADY_ASSIGNED",
    409
  )
}
