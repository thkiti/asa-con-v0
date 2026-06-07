import type { RetailPriceSource } from "@/lib/pricing/types"

function parseUnitPrice(unitPrice: string): number {
  const n = Number(unitPrice)
  return Number.isFinite(n) ? n : 0
}

/** Server-resolved product snapshot used when adding to cart. */
export type PosCartProduct = {
  productId: string
  code: string
  name: string
  unitPrice: string
  priceSource: RetailPriceSource
  catalogImageUrl?: string | null
}

export type PosCartLine = {
  productId: string
  code: string
  name: string
  qty: number
  unitPrice: string
  priceSource: RetailPriceSource
  catalogImageUrl?: string | null
}

export function lineAmount(line: Pick<PosCartLine, "qty" | "unitPrice">): string {
  return (parseUnitPrice(line.unitPrice) * line.qty).toFixed(2)
}

export function cartTotal(lines: readonly PosCartLine[]): string {
  const total = lines.reduce(
    (sum, line) => sum + parseUnitPrice(line.unitPrice) * line.qty,
    0
  )
  return total.toFixed(2)
}

/** New scan/add: merge by productId and increment qty by 1. */
export function addProductToCart(
  lines: readonly PosCartLine[],
  product: PosCartProduct
): PosCartLine[] {
  const index = lines.findIndex((l) => l.productId === product.productId)
  if (index < 0) {
    return [
      ...lines,
      {
        productId: product.productId,
        code: product.code,
        name: product.name,
        qty: 1,
        unitPrice: product.unitPrice,
        priceSource: product.priceSource,
        catalogImageUrl: product.catalogImageUrl ?? null,
      },
    ]
  }

  return lines.map((line, i) =>
    i === index ? { ...line, qty: line.qty + 1 } : line
  )
}

export function setLineQty(
  lines: readonly PosCartLine[],
  productId: string,
  qty: number
): PosCartLine[] {
  const nextQty = Math.max(1, Math.trunc(qty))
  return lines.map((line) =>
    line.productId === productId ? { ...line, qty: nextQty } : line
  )
}

export function incrementLineQty(
  lines: readonly PosCartLine[],
  productId: string
): PosCartLine[] {
  const line = lines.find((l) => l.productId === productId)
  if (!line) return [...lines]
  return setLineQty(lines, productId, line.qty + 1)
}

export function decrementLineQty(
  lines: readonly PosCartLine[],
  productId: string
): PosCartLine[] {
  const line = lines.find((l) => l.productId === productId)
  if (!line) return [...lines]
  return setLineQty(lines, productId, line.qty - 1)
}

export function removeCartLine(
  lines: readonly PosCartLine[],
  productId: string
): PosCartLine[] {
  return lines.filter((line) => line.productId !== productId)
}

export function clearCart(): PosCartLine[] {
  return []
}
