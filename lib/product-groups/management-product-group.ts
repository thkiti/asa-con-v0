import type { PrismaClient } from "@/generated/prisma/client"

/** Company-wide management summary headers (zero-fill catalog seed). */
export const POLICY_SUMMARY_HEADERS = [
  "0100900",
  "1100900",
  "1200900",
  "2100900",
  "2200900",
  "3100900",
  "4100900",
  "5100900",
  "5500900",
  "6100900",
  "6500900",
  "7001900",
  "7002900",
  "8001900",
] as const

export type PolicySummaryHeader = (typeof POLICY_SUMMARY_HEADERS)[number]

/** Explicit summary headers preserved as-is (subset of policy list). */
export const EXPLICIT_SUMMARY_HEADERS: readonly string[] = [
  "4100900",
  "5100900",
  "5500900",
  "6100900",
  "6500900",
  "7001900",
  "7002900",
  "8001900",
]

export type ReferenceProductGroupRow = {
  productGroup: string | null
}

export type SummaryHeaderLabel = {
  headerCode: string
  name: string | null
  labelStatus: "ok" | "missing"
}

export type ManagementGroupAggregate = {
  qty?: number
  amount?: number
  items?: number
}

export type ManagementGroupSummaryRow = {
  headerCode: string
  label: string | null
  labelStatus: "ok" | "missing"
  qty: number
  amount: number
  items: number
}

function digitsOnly(code: string | null | undefined): string {
  return String(code ?? "").replace(/\D/g, "")
}

/** True when code is already a management summary header (policy seed or GG00900). */
export function isExplicitSummaryHeader(code7: string): boolean {
  const d = digitsOnly(code7)
  if (d.length !== 7) return false
  if (EXPLICIT_SUMMARY_HEADERS.includes(d)) return true
  if (d.endsWith("00900")) return true
  return false
}

/**
 * Normalize configured ReferenceStock.productGroup to summary header.
 * Default: GG00900. GG=70: GGTT900. Explicit policy headers preserved.
 */
export function normalizeToSummaryHeader(
  configured: string | null | undefined
): string | null {
  const d = digitsOnly(configured)
  if (d.length !== 7) return null

  if (isExplicitSummaryHeader(d)) return d

  const gg = d.slice(0, 2)
  const tt = d.slice(2, 4)
  if (gg === "70") return `${gg}${tt}900`
  return `${gg}00900`
}

/** First non-empty ReferenceStock.productGroup for a sellable productId. */
export function resolveConfiguredProductGroup(
  productId: string,
  refByProductId: ReadonlyMap<string, readonly ReferenceProductGroupRow[]>
): string | null {
  const rows = refByProductId.get(productId)
  if (!rows?.length) return null
  for (const row of rows) {
    const trimmed = String(row.productGroup ?? "").trim()
    if (trimmed) return trimmed
  }
  return null
}

/** Configured group + normalized summary header; null when unresolved. */
export function resolveToSummaryHeader(
  productId: string,
  refByProductId: ReadonlyMap<string, readonly ReferenceProductGroupRow[]>
): { configured: string; summaryHeader: string } | null {
  const configured = resolveConfiguredProductGroup(productId, refByProductId)
  if (!configured) return null
  const summaryHeader = normalizeToSummaryHeader(configured)
  if (!summaryHeader) return null
  return { configured, summaryHeader }
}

type CatalogDb = Pick<PrismaClient, "referenceStock">

/** Union of policy headers + normalized groups from active ReferenceStock. */
export async function loadCompanySummaryCatalog(
  db: CatalogDb
): Promise<string[]> {
  const refs = await db.referenceStock.findMany({
    where: {
      deleted: false,
      productGroup: { not: null },
    },
    distinct: ["productGroup"],
    select: { productGroup: true },
  })

  const codes = new Set<string>(POLICY_SUMMARY_HEADERS)
  for (const ref of refs) {
    const summary = normalizeToSummaryHeader(ref.productGroup)
    if (summary) codes.add(summary)
  }

  return [...codes].sort((a, b) => a.localeCompare(b))
}

type LabelDb = Pick<PrismaClient, "product">

/** Labels from group-header Product.name; missing row → labelStatus missing. */
export async function loadSummaryHeaderLabels(
  db: LabelDb,
  headerCodes: readonly string[]
): Promise<Map<string, SummaryHeaderLabel>> {
  const unique = [...new Set(headerCodes.map((c) => String(c).trim()).filter(Boolean))]
  if (unique.length === 0) return new Map()

  const products = await db.product.findMany({
    where: { code: { in: unique }, deleted: false },
    select: { code: true, name: true },
  })
  const nameByCode = new Map(products.map((p) => [p.code, p.name]))

  const result = new Map<string, SummaryHeaderLabel>()
  for (const headerCode of unique) {
    const rawName = nameByCode.get(headerCode)
    const name = rawName != null && String(rawName).trim() ? String(rawName).trim() : null
    result.set(headerCode, {
      headerCode,
      name,
      labelStatus: name ? "ok" : "missing",
    })
  }
  return result
}

export function mergeManagementGroupSummary(input: {
  catalog: readonly string[]
  labels: ReadonlyMap<string, SummaryHeaderLabel>
  aggregates: ReadonlyMap<string, ManagementGroupAggregate>
  includeZeroRows: boolean
}): ManagementGroupSummaryRow[] {
  const catalogSet = new Set(input.catalog)
  const headerCodes = input.includeZeroRows
    ? [...new Set(input.catalog)].sort((a, b) => a.localeCompare(b))
    : [...input.aggregates.keys()]
        .filter((code) => catalogSet.has(code))
        .sort((a, b) => a.localeCompare(b))

  return headerCodes.map((headerCode) => {
    const labelEntry = input.labels.get(headerCode)
    const agg = input.aggregates.get(headerCode)
    return {
      headerCode,
      label: labelEntry?.name ?? null,
      labelStatus: labelEntry?.labelStatus ?? "missing",
      qty: agg?.qty ?? 0,
      amount: agg?.amount ?? 0,
      items: agg?.items ?? 0,
    }
  })
}
