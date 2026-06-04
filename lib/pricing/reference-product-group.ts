import type { PrismaClient } from "@/generated/prisma/client"
import { getActiveSellingPrice } from "./selling-price"

export type SellingPriceGroupMode = "productGroup" | "fallback_gt"

export type GroupMemberPriceRow = {
  productId: string
  code: string
  name: string
  price: number | null
}

export function pickCanonicalProductGroup(
  productGroups: Array<string | null | undefined>
): {
  canonical: string | null
  ambiguous: boolean
  distinctNonEmpty: string[]
} {
  const trimmed = productGroups
    .map((g) => (g == null ? "" : String(g).trim()))
    .filter((g) => g.length > 0)
  if (trimmed.length === 0) {
    return { canonical: null, ambiguous: false, distinctNonEmpty: [] }
  }
  const distinct = [...new Set(trimmed)]
  if (distinct.length === 1) {
    return { canonical: distinct[0]!, ambiguous: false, distinctNonEmpty: distinct }
  }
  const counts = new Map<string, number>()
  for (const g of trimmed) {
    counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  let best = distinct[0]!
  let bestN = counts.get(best) ?? 0
  for (const [g, n] of counts) {
    if (n > bestN) {
      best = g
      bestN = n
    }
  }
  return { canonical: best, ambiguous: true, distinctNonEmpty: distinct }
}

export function pricesEqual(a: number | null, b: number | null): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return Math.abs(a - b) < 1e-6
}

export function membersMatchingOldPrice(
  members: GroupMemberPriceRow[],
  anchorPrice: number | null
): GroupMemberPriceRow[] {
  return members.filter((m) => pricesEqual(m.price, anchorPrice))
}

export function membersSkippedDifferentFromAnchor(
  members: GroupMemberPriceRow[],
  anchorPrice: number | null
): GroupMemberPriceRow[] {
  return members.filter((m) => !pricesEqual(m.price, anchorPrice))
}

export function samePriceAmongPricedMembers(
  members: GroupMemberPriceRow[]
): boolean {
  const priced = members.map((m) => m.price).filter((p): p is number => p != null)
  if (priced.length <= 1) return true
  const first = priced[0]!
  return priced.every((p) => Math.abs(p - first) < 1e-6)
}

export type SellingPriceGroupPreview = {
  mode: SellingPriceGroupMode
  groupLabel: string
  groupAmbiguous: boolean
  ambiguousProductGroups?: string[]
  anchor: {
    productId: string
    code: string
    name: string
    price: number | null
    groupCode: number
    typeCode: number
  }
  members: GroupMemberPriceRow[]
  memberCount: number
  missingPriceCount: number
  samePriceAmongPriced: boolean
  bulkEligibleCount: number
  bulkSkippedCount: number
  bulkSkipped: GroupMemberPriceRow[]
}

export type SellingPriceGroupPrisma = Pick<
  PrismaClient,
  "product" | "referenceStock" | "sellingPrice"
>

async function activePriceNumber(
  db: Pick<PrismaClient, "sellingPrice">,
  productId: string
): Promise<number | null> {
  const price = await getActiveSellingPrice(db, productId)
  return price != null ? Number(price.toString()) : null
}

export async function loadSellingPriceGroupPreview(
  db: SellingPriceGroupPrisma,
  anchorProductId: string
): Promise<SellingPriceGroupPreview | null> {
  const anchor = await db.product.findFirst({
    where: { id: anchorProductId, deleted: false },
    select: {
      id: true,
      code: true,
      name: true,
      groupCode: true,
      typeCode: true,
    },
  })
  if (!anchor) return null

  const refs = await db.referenceStock.findMany({
    where: { productId: anchorProductId, deleted: false },
    select: { productGroup: true },
  })
  const pick = pickCanonicalProductGroup(refs.map((r) => r.productGroup))

  let mode: SellingPriceGroupMode
  let groupLabel: string
  let memberIds: string[]

  if (pick.canonical != null) {
    mode = "productGroup"
    groupLabel = pick.canonical
    const rows = await db.referenceStock.findMany({
      where: { productGroup: pick.canonical, deleted: false },
      select: { productId: true },
    })
    memberIds = [...new Set(rows.map((r) => r.productId))]
  } else {
    mode = "fallback_gt"
    groupLabel = `G${anchor.groupCode}-T${anchor.typeCode}`
    const prods = await db.product.findMany({
      where: {
        deleted: false,
        groupCode: anchor.groupCode,
        typeCode: anchor.typeCode,
      },
      select: { id: true },
    })
    memberIds = prods.map((p) => p.id)
  }

  const uniqueIds = [...new Set(memberIds)]
  const products = await db.product.findMany({
    where: { id: { in: uniqueIds }, deleted: false },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  })

  const anchorPrice = await activePriceNumber(db, anchor.id)

  const members: GroupMemberPriceRow[] = await Promise.all(
    products.map(async (p) => ({
      productId: p.id,
      code: p.code,
      name: p.name,
      price: await activePriceNumber(db, p.id),
    }))
  )

  const missingPriceCount = members.filter((m) => m.price == null).length
  const pricedMembers = members.filter((m) => m.price != null)
  const samePriceAmongPriced =
    pricedMembers.length >= 2
      ? samePriceAmongPricedMembers(members)
      : pricedMembers.length <= 1

  const skipped = membersSkippedDifferentFromAnchor(members, anchorPrice)
  const eligible = membersMatchingOldPrice(members, anchorPrice)

  return {
    mode,
    groupLabel,
    groupAmbiguous: pick.ambiguous,
    ambiguousProductGroups: pick.ambiguous ? pick.distinctNonEmpty : undefined,
    anchor: {
      productId: anchor.id,
      code: anchor.code,
      name: anchor.name,
      price: anchorPrice,
      groupCode: anchor.groupCode,
      typeCode: anchor.typeCode,
    },
    members,
    memberCount: members.length,
    missingPriceCount,
    samePriceAmongPriced,
    bulkEligibleCount: eligible.length,
    bulkSkippedCount: skipped.length,
    bulkSkipped: skipped,
  }
}
