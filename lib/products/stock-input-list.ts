import type { PrismaClient } from "@/generated/prisma/client"

export type StockInputListSourceType = "REFERENCE" | "SHOE"

export type StockInputListRow = {
  rowKey: string
  source: StockInputListSourceType
  referenceStockId: string | null
  productId: string
  productCode: string
  productName: string
  hookGroup: string
  hookNo: number | null
  hookLabel: string
  supplierCode: string
  displayCode: string
  displayName: string
  productGroup: string | null
  groupCode: string | null
  sortKey: string
}

type ReferenceWithProduct = {
  id: string
  hookGroup: string
  hookNo: number
  supplierCode: string
  productCode: string
  productGroup: string | null
  productId: string
  product: {
    id: string
    code: string
    name: string
  }
}

type ShoeProduct = {
  id: string
  code: string
  name: string
}

const SHOE_CODE_PREFIXES = ["51", "55", "61", "65"] as const

export function computeShoeGroupCode(productCode: string): string {
  return productCode.slice(0, 4) + "900"
}

export function computeDisplayCode(input: {
  hookGroup: string
  supplierCode: string
  productCode: string
  refProductCode?: string | null
}): string {
  const supplier = String(input.supplierCode ?? "").trim()
  const isShoeGroup = input.hookGroup === "S"
  if (isShoeGroup && (supplier === "" || supplier === "-")) {
    return String(input.refProductCode ?? input.productCode ?? "").trim()
  }
  return (
    supplier ||
    String(input.refProductCode ?? "").trim() ||
    String(input.productCode ?? "").trim()
  )
}

export function computeRowKey(row: {
  hookGroup: string
  hookNo: number | null
  productId: string
}): string {
  if (row.hookGroup === "S") {
    return `S-${row.productId}`
  }
  return `${row.hookGroup}-${row.hookNo ?? 0}`
}

export function computeSortKey(row: {
  productGroup: string | null
  groupCode: string | null
  hookGroup: string
  hookNo: number | null
  supplierCode: string
  productCode: string
}): string {
  const productGroup = row.productGroup ?? row.groupCode ?? ""
  const hookNo = row.hookNo == null ? "" : String(row.hookNo).padStart(6, "0")
  return [
    productGroup,
    row.hookGroup,
    hookNo,
    row.supplierCode,
    row.productCode,
  ].join("|")
}

function mapReferenceRow(ref: ReferenceWithProduct): StockInputListRow {
  const productGroup = ref.productGroup ?? null
  const displayCode = computeDisplayCode({
    hookGroup: ref.hookGroup,
    supplierCode: ref.supplierCode,
    productCode: ref.product.code,
    refProductCode: ref.productCode,
  })

  const row = {
    rowKey: "",
    source: "REFERENCE" as const,
    referenceStockId: ref.id,
    productId: ref.productId,
    productCode: ref.product.code,
    productName: ref.product.name,
    hookGroup: ref.hookGroup,
    hookNo: ref.hookNo,
    hookLabel: `${ref.hookGroup}.${ref.hookNo}`,
    supplierCode: ref.supplierCode,
    displayCode,
    displayName: ref.product.name,
    productGroup,
    groupCode: productGroup,
    sortKey: "",
  }

  row.rowKey = computeRowKey(row)
  row.sortKey = computeSortKey(row)
  return row
}

function mapShoeRow(
  product: ShoeProduct,
  refS: ReferenceWithProduct | undefined
): StockInputListRow {
  const groupCode = computeShoeGroupCode(product.code)
  const hookNo = refS?.hookNo ?? null
  const hookLabel = hookNo != null ? `S.${hookNo}` : "S"

  const row = {
    rowKey: "",
    source: "SHOE" as const,
    referenceStockId: refS?.id ?? null,
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    hookGroup: "S",
    hookNo,
    hookLabel,
    supplierCode: product.code,
    displayCode: product.code,
    displayName: product.name,
    productGroup: groupCode,
    groupCode,
    sortKey: "",
  }

  row.rowKey = computeRowKey(row)
  row.sortKey = computeSortKey(row)
  return row
}

export function dedupeStockInputRows(rows: StockInputListRow[]): StockInputListRow[] {
  const map = new Map<string, StockInputListRow>()
  for (const row of rows) {
    if (!map.has(row.rowKey)) {
      map.set(row.rowKey, row)
    }
  }
  return Array.from(map.values())
}

export function sortStockInputRows(rows: StockInputListRow[]): StockInputListRow[] {
  return [...rows].sort((a, b) => {
    if (a.sortKey !== b.sortKey) {
      return a.sortKey.localeCompare(b.sortKey)
    }
    return a.rowKey.localeCompare(b.rowKey)
  })
}

export async function buildStockInputList(
  prisma: Pick<PrismaClient, "referenceStock" | "product">
): Promise<StockInputListRow[]> {
  const refs = await prisma.referenceStock.findMany({
    where: {
      deleted: false,
      product: { deleted: false },
    },
    include: {
      product: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  })

  const referenceRows = refs.map((ref) => mapReferenceRow(ref))

  const shoeProducts = await prisma.product.findMany({
    where: {
      deleted: false,
      OR: SHOE_CODE_PREFIXES.map((prefix) => ({
        code: { startsWith: prefix },
      })),
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
    orderBy: { code: "asc" },
  })

  const shoeRefByProductId = new Map(
    refs
      .filter((r) => r.hookGroup === "S")
      .map((r) => [r.productId, r])
  )

  const shoeRows = shoeProducts.map((product) =>
    mapShoeRow(product, shoeRefByProductId.get(product.id))
  )

  const combined = dedupeStockInputRows([...referenceRows, ...shoeRows])
  return sortStockInputRows(combined)
}
