import type { PrismaClient } from "@/generated/prisma/client"
import { toDec, ZERO } from "@/lib/stock/decimal"
import {
  isSellableProductType,
} from "@/lib/products/product-type-rules"
import { CheckoutError, assertCheckoutRequiredString } from "./checkout-errors"
import type { CheckoutInput, PreparedCheckout, PreparedCheckoutLine } from "./checkout-types"
import { computePaymentChange, parsePaidAmount } from "./payment"

function parsePositiveQty(raw: unknown, productId: string): number {
  const qty = Math.trunc(Number(raw))
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new CheckoutError(
      `Invalid qty for product ${productId}`,
      "INVALID_QTY",
      400
    )
  }
  return qty
}

export async function validateAndPrepareCheckout(
  db: PrismaClient,
  input: CheckoutInput
): Promise<PreparedCheckout> {
  const branchId = assertCheckoutRequiredString(input.branchId, "branchId")
  const staffId = input.staffId ? String(input.staffId).trim() || null : null

  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new CheckoutError("Cart is empty", "EMPTY_CART", 400)
  }

  const branch = await db.branch.findUnique({ where: { id: branchId } })
  if (!branch || branch.deleted || !branch.isActive) {
    throw new CheckoutError("Branch not found or inactive", "INVALID_BRANCH", 400)
  }

  const productIds = [...new Set(input.lines.map((l) => String(l.productId)))]
  const products = await db.product.findMany({
    where: { id: { in: productIds }, deleted: false },
  })
  const productById = new Map(products.map((p) => [p.id, p]))

  const preparedLines: PreparedCheckoutLine[] = []
  let total = ZERO

  for (const line of input.lines) {
    const productId = String(line.productId ?? "").trim()
    if (!productId) {
      throw new CheckoutError("productId is required on every line", "MISSING_PRODUCT", 400)
    }

    const product = productById.get(productId)
    if (!product) {
      throw new CheckoutError(`Product not found: ${productId}`, "PRODUCT_NOT_FOUND", 404)
    }

    if (!isSellableProductType(product.productType)) {
      throw new CheckoutError(
        `Product type not sellable at POS: ${product.productType}`,
        "NOT_SELLABLE",
        400
      )
    }

    const qty = parsePositiveQty(line.qty, productId)
    const unitPrice = toDec(line.unitPrice)
    if (unitPrice.lt(ZERO)) {
      throw new CheckoutError(
        `Invalid unitPrice for product ${productId}`,
        "INVALID_PRICE",
        400
      )
    }

    const lineTotal = unitPrice.mul(qty)
    total = total.plus(lineTotal)

    preparedLines.push({
      productId,
      productType: product.productType,
      qty,
      unitPrice,
      lineTotal,
    })
  }

  const paidAmount = parsePaidAmount(input.paidAmount)
  const change = computePaymentChange(total, paidAmount, input.paymentMethod)

  return {
    branchId,
    staffId,
    paymentMethod: input.paymentMethod,
    paidAmount,
    total,
    change,
    lines: preparedLines,
  }
}