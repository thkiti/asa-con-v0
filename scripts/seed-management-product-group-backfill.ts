/**
 * Management Product Group master backfill (dry-run by default).
 *
 * Source of truth: docs/MANAGEMENT_PRODUCT_GROUP_BACKFILL_PLAN.md
 *
 * Usage:
 *   npx tsx scripts/seed-management-product-group-backfill.ts          # dry-run (default)
 *   npx tsx scripts/seed-management-product-group-backfill.ts --apply    # write (requires approval)
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { ProductType } from "../generated/prisma/client"
import { normalizePosinyProductCode } from "../lib/import/validation/product-code"
import { getNextHookNo } from "../lib/master/get-next-hook-no"
import {
  POLICY_SUMMARY_HEADERS,
  loadSummaryHeaderLabels,
  normalizeToSummaryHeader,
  resolveToSummaryHeader,
  type ReferenceProductGroupRow,
} from "../lib/product-groups/management-product-group"
import { prisma } from "../lib/shared/prisma"

const APPLY = process.argv.includes("--apply")

const SUMMARY_HEADER_ROWS: { code: string; name: string }[] = [
  { code: "0100900", name: "Home Key" },
  { code: "1100900", name: "Car Key" },
  { code: "1200900", name: "Motorcycle Key" },
  { code: "2100900", name: "Car Safety Head" },
  { code: "2200900", name: "Motorcycle Safety Head" },
  { code: "3100900", name: "Special Key" },
  { code: "4100900", name: "Keys Add-On Sales" },
  { code: "5100900", name: "Ladies' Heels" },
  { code: "5500900", name: "Ladies' Soles" },
  { code: "6100900", name: "Men's Heels" },
  { code: "6500900", name: "Men's Soles" },
  { code: "7001900", name: "Stretching" },
  { code: "7002900", name: "Glue/Stitching" },
  { code: "8001900", name: "Shoe Add-On Sales" },
]

const SHOE_PREFIXES = ["51", "55", "61", "65"] as const
const ADDON_PREFIXES = ["41", "80"] as const
const SERVICE_PREFIX = "70"

/** Valid 70* service TT buckets only (maps to policy headers 7001900 / 7002900). */
const VALID_SERVICE_TYPE_CODES = new Set([1, 2])

/**
 * Misclassified GG=70 items reclassified to GG=80 (80-01-XXX).
 * Do not map 7003* to 7001900 / 7002900. No 7003900 header.
 */
export const GG80_RECLASSIFICATION = [
  {
    legacyCode: "7003001",
    replacementCode: "8001008",
    replacementName: "VINYL INNER-SOLE LADIES",
    replacementAction: "create" as const,
  },
  {
    legacyCode: "7003002",
    replacementCode: "8001009",
    replacementName: "VINYL INNER-SOLE MEN",
    replacementAction: "create" as const,
  },
  {
    legacyCode: "7003003",
    replacementCode: "8001007",
    replacementName: "LEATHER INNER-SOLE",
    replacementAction: "repurpose" as const,
  },
]

const RETIRED_SERVICE_SKUS = new Set(GG80_RECLASSIFICATION.map((r) => r.legacyCode))

const MASTER_DATA_CORRECTIONS: {
  retire?: { code: string; reason: string }[]
  rename?: { code: string; name: string; reason: string }[]
  create?: { code: string; name: string; reason: string }[]
} = {
  retire: GG80_RECLASSIFICATION.map((row) => ({
    code: row.legacyCode,
    reason: `not a service (GG=70); reclassified to ${row.replacementCode} (GG=80)`,
  })),
  rename: GG80_RECLASSIFICATION.filter((row) => row.replacementAction === "repurpose").map(
    (row) => ({
      code: row.replacementCode,
      name: row.replacementName,
      reason: `repurpose ${row.replacementCode} for ${row.legacyCode} → GG=80 retail`,
    })
  ),
  create: GG80_RECLASSIFICATION.filter((row) => row.replacementAction === "create").map(
    (row) => ({
      code: row.replacementCode,
      name: row.replacementName,
      reason: `new GG=80 retail SKU replacing retired ${row.legacyCode}`,
    })
  ),
}

type ProductAction =
  | { action: "create"; code: string; name: string }
  | { action: "undelete"; code: string; name: string; previousName: string }
  | { action: "skip"; code: string; reason: string }
  | { action: "review"; code: string; reason: string; currentName: string; proposedName: string }

type SellableCorrectionAction =
  | { action: "retire"; code: string; reason: string; currentName: string }
  | { action: "rename"; code: string; name: string; reason: string; currentName: string }
  | { action: "create"; code: string; name: string; reason: string }
  | { action: "skip"; code: string; reason: string }

type RefAction =
  | { action: "create"; productCode: string; productId: string; hookGroup: string; hookNo: number; productGroup: string }
  | { action: "skip"; productCode: string; reason: string }

function isSmokeSku(code: string): boolean {
  const c = code.trim().toUpperCase()
  return c.startsWith("SMOKE-") || c.startsWith("P1C-")
}

function productCreateFields(code: string, name: string) {
  const parts = normalizePosinyProductCode(code)
  if (!parts) throw new Error(`Invalid summary header code: ${code}`)
  return {
    code: parts.code,
    name,
    groupCode: parts.groupCode,
    typeCode: parts.typeCode,
    runningCode: parts.runningCode,
    productType: ProductType.TRACKED,
    deleted: false,
  }
}

function resolveShoeProductGroup(code: string): string | null {
  if (code.startsWith("51")) return "5100900"
  if (code.startsWith("55")) return "5500900"
  if (code.startsWith("61")) return "6100900"
  if (code.startsWith("65")) return "6500900"
  return null
}

function resolveAddonProductGroup(code: string): string | null {
  if (code.startsWith("41")) return "4100900"
  if (code.startsWith("80")) return "8001900"
  return null
}

function resolveServiceProductGroup(code: string): string | null {
  if (RETIRED_SERVICE_SKUS.has(code)) {
    return null
  }
  const parts = normalizePosinyProductCode(code)
  if (!parts || parts.groupCode !== 70) return null
  if (!VALID_SERVICE_TYPE_CODES.has(parts.typeCode)) return null
  return `${String(parts.groupCode).padStart(2, "0")}${String(parts.typeCode).padStart(2, "0")}900`
}

function planSellableCorrections(
  existing: { code: string; name: string; deleted: boolean }[]
): SellableCorrectionAction[] {
  const byCode = new Map(existing.map((p) => [p.code, p]))
  const actions: SellableCorrectionAction[] = []

  for (const row of MASTER_DATA_CORRECTIONS.retire ?? []) {
    const found = byCode.get(row.code)
    if (!found) {
      actions.push({ action: "skip", code: row.code, reason: "retire target not found" })
      continue
    }
    if (found.deleted) {
      actions.push({ action: "skip", code: row.code, reason: "already deleted" })
      continue
    }
    actions.push({
      action: "retire",
      code: row.code,
      reason: row.reason,
      currentName: found.name,
    })
  }

  for (const row of MASTER_DATA_CORRECTIONS.create ?? []) {
    const found = byCode.get(row.code)
    if (found && !found.deleted) {
      actions.push({ action: "skip", code: row.code, reason: "create target already exists" })
      continue
    }
    if (found?.deleted) {
      actions.push({
        action: "rename",
        code: row.code,
        name: row.name,
        reason: `${row.reason}; undelete existing row`,
        currentName: found.name,
      })
      continue
    }
    actions.push({ action: "create", code: row.code, name: row.name, reason: row.reason })
  }

  for (const row of MASTER_DATA_CORRECTIONS.rename ?? []) {
    const found = byCode.get(row.code)
    if (!found) {
      actions.push({ action: "skip", code: row.code, reason: "rename target not found" })
      continue
    }
    if (found.deleted) {
      actions.push({ action: "skip", code: row.code, reason: "target deleted; cannot rename" })
      continue
    }
    if (found.name.trim() === row.name) {
      actions.push({ action: "skip", code: row.code, reason: "name already matches" })
      continue
    }
    actions.push({
      action: "rename",
      code: row.code,
      name: row.name,
      reason: row.reason,
      currentName: found.name,
    })
  }

  return actions
}

function planProductHeaders(
  existing: { code: string; name: string; deleted: boolean }[]
): ProductAction[] {
  const byCode = new Map(existing.map((p) => [p.code, p]))
  const actions: ProductAction[] = []

  for (const row of SUMMARY_HEADER_ROWS) {
    const found = byCode.get(row.code)
    if (!found) {
      actions.push({ action: "create", code: row.code, name: row.name })
      continue
    }
    if (found.deleted) {
      actions.push({
        action: "undelete",
        code: row.code,
        name: row.name,
        previousName: found.name,
      })
      continue
    }
    const currentName = found.name.trim()
    if (currentName !== row.name) {
      actions.push({
        action: "review",
        code: row.code,
        reason: "name differs from plan; automated seed will not overwrite",
        currentName,
        proposedName: row.name,
      })
      continue
    }
    actions.push({ action: "skip", code: row.code, reason: "already exists with matching name" })
  }

  return actions
}

function hasActiveRefWithGroup(
  refs: { deleted: boolean; productGroup: string | null }[]
): boolean {
  return refs.some((r) => !r.deleted && String(r.productGroup ?? "").trim() !== "")
}

async function planReferenceStockCreates(input: {
  products: { id: string; code: string }[]
  refsByProductId: Map<string, { deleted: boolean; productGroup: string | null; hookGroup: string }[]>
  hookGroup: string
  resolveGroup: (code: string) => string | null
  startHookNo?: number
}): Promise<{ actions: RefAction[]; nextHookNo: number }> {
  const actions: RefAction[] = []
  let hookNo = input.startHookNo ?? (await getNextHookNo(prisma, input.hookGroup))

  for (const product of input.products) {
    if (isSmokeSku(product.code)) {
      actions.push({ action: "skip", productCode: product.code, reason: "smoke/P1C SKU excluded" })
      continue
    }

    if (RETIRED_SERVICE_SKUS.has(product.code)) {
      actions.push({
        action: "skip",
        productCode: product.code,
        reason: "retired from 70* services (master-data correction)",
      })
      continue
    }
    const productGroup = input.resolveGroup(product.code)
    if (!productGroup) {
      actions.push({ action: "skip", productCode: product.code, reason: "no productGroup mapping rule" })
      continue
    }

    const refs = input.refsByProductId.get(product.id) ?? []
    if (hasActiveRefWithGroup(refs)) {
      actions.push({
        action: "skip",
        productCode: product.code,
        reason: "active ReferenceStock with productGroup already exists",
      })
      continue
    }

    const activeSameHook = refs.some((r) => !r.deleted && r.hookGroup === input.hookGroup)
    if (activeSameHook) {
      actions.push({
        action: "skip",
        productCode: product.code,
        reason: `active ReferenceStock in hookGroup ${input.hookGroup} without productGroup (manual review)`,
      })
      continue
    }

    actions.push({
      action: "create",
      productCode: product.code,
      productId: product.id,
      hookGroup: input.hookGroup,
      hookNo,
      productGroup,
    })
    hookNo += 1
  }

  return { actions, nextHookNo: hookNo }
}

function printReclassificationReport(): void {
  console.log("\n=== GG=80 reclassification (7003* → 80-01-XXX) ===")
  console.log("Policy: GG=70 = Services only (TT=01/02). GG=80 = Shoe Add-On / Retail.")
  console.log("No 7003900. No 7003* mapping to 7001900 / 7002900.\n")
  console.log("| Legacy (retire) | Replacement (GG=80) | Name |")
  console.log("|-----------------|---------------------|------|")
  for (const row of GG80_RECLASSIFICATION) {
    const action =
      row.replacementAction === "repurpose"
        ? `repurpose ${row.replacementCode}`
        : `create ${row.replacementCode}`
    console.log(
      `| ${row.legacyCode} | ${row.replacementCode} (${action}) | ${row.replacementName} |`
    )
  }
  console.log("\n8001xxx slot audit: 8001001–8001006 in use; 8001007 repurpose; 8001008–8001009 new.")
}

function printSellableCorrectionReport(actions: SellableCorrectionAction[]): void {
  const retires = actions.filter((a) => a.action === "retire")
  const creates = actions.filter((a) => a.action === "create")
  const renames = actions.filter((a) => a.action === "rename")
  const skips = actions.filter((a) => a.action === "skip")

  printReclassificationReport()

  console.log("\n=== Sellable Product mutations ===")
  console.log(`Would RETIRE (deleted=true): ${retires.length}`)
  for (const row of retires) {
    if (row.action !== "retire") continue
    console.log(`  - ${row.code}  "${row.currentName}"  (${row.reason})`)
  }
  console.log(`Would CREATE: ${creates.length}`)
  for (const row of creates) {
    if (row.action !== "create") continue
    console.log(`  + ${row.code}  ${row.name}  (${row.reason})`)
  }
  console.log(`Would RENAME: ${renames.length}`)
  for (const row of renames) {
    if (row.action !== "rename") continue
    console.log(`  ~ ${row.code}  "${row.currentName}" → "${row.name}"  (${row.reason})`)
  }
  console.log(`SKIP: ${skips.length}`)
  for (const row of skips) {
    console.log(`  = ${row.code}  ${row.reason}`)
  }
}

function appendPlannedRetailRefCreates(
  actions: RefAction[],
  plannedCreates: SellableCorrectionAction[],
  startHookNo: number
): { actions: RefAction[]; nextHookNo: number } {
  let hookNo = startHookNo
  const next = [...actions]
  for (const row of plannedCreates) {
    if (row.action !== "create") continue
    next.push({
      action: "create",
      productCode: row.code,
      productId: `(planned:${row.code})`,
      hookGroup: "O",
      hookNo,
      productGroup: "8001900",
    })
    hookNo += 1
  }
  return { actions: next, nextHookNo: hookNo }
}

async function applySellableCorrections(actions: SellableCorrectionAction[]): Promise<void> {
  for (const action of actions) {
    if (action.action === "retire") {
      await prisma.product.update({
        where: { code: action.code },
        data: { deleted: true },
      })
      continue
    }
    if (action.action === "rename") {
      await prisma.product.update({
        where: { code: action.code },
        data: { name: action.name, deleted: false },
      })
      continue
    }
    if (action.action === "create") {
      await prisma.product.create({ data: productCreateFields(action.code, action.name) })
    }
  }
}

async function applyProductHeaders(actions: ProductAction[]): Promise<void> {
  for (const action of actions) {
    if (action.action === "create") {
      await prisma.product.create({ data: productCreateFields(action.code, action.name) })
      continue
    }
    if (action.action === "undelete") {
      await prisma.product.update({
        where: { code: action.code },
        data: { deleted: false, name: action.name },
      })
    }
  }
}

async function applyReferenceStock(actions: RefAction[]): Promise<void> {
  for (const action of actions) {
    if (action.action !== "create") continue
    await prisma.referenceStock.create({
      data: {
        productId: action.productId,
        productCode: action.productCode,
        hookGroup: action.hookGroup,
        hookNo: action.hookNo,
        supplierCode: action.hookGroup === "S" ? "-" : action.productCode,
        productGroup: action.productGroup,
        deleted: false,
      },
    })
  }
}

function printProductReport(actions: ProductAction[]): void {
  const creates = actions.filter((a) => a.action === "create")
  const undeletes = actions.filter((a) => a.action === "undelete")
  const skips = actions.filter((a) => a.action === "skip")
  const reviews = actions.filter((a) => a.action === "review")

  console.log("\n=== Product summary headers (14 policy codes) ===")
  console.log(`Would CREATE: ${creates.length}`)
  for (const row of creates) {
    console.log(`  + ${row.code}  ${row.name}`)
  }
  console.log(`Would UNDELETE: ${undeletes.length}`)
  for (const row of undeletes) {
    console.log(`  ~ ${row.code}  restore deleted=true → name="${row.name}" (was "${row.previousName}")`)
  }
  console.log(`SKIP (already ok): ${skips.length}`)
  for (const row of skips) {
    console.log(`  = ${row.code}  ${row.reason}`)
  }
  console.log(`REVIEW (no auto-update): ${reviews.length}`)
  for (const row of reviews) {
    console.log(`  ? ${row.code}  current="${row.currentName}" proposed="${row.proposedName}"`)
  }
}

function printRefReport(label: string, actions: RefAction[]): void {
  const creates = actions.filter((a) => a.action === "create")
  const skips = actions.filter((a) => a.action === "skip")

  console.log(`\n=== ReferenceStock — ${label} ===`)
  console.log(`Would CREATE: ${creates.length}`)
  for (const row of creates) {
    if (row.action !== "create") continue
    console.log(
      `  + ${row.productCode}  hook=${row.hookGroup}.${row.hookNo}  productGroup=${row.productGroup}`
    )
  }
  console.log(`SKIP: ${skips.length}`)
  if (skips.length > 0 && skips.length <= 10) {
    for (const row of skips) {
      console.log(`  = ${row.productCode}  ${row.reason}`)
    }
  } else if (skips.length > 10) {
    console.log(`  (${skips.length} rows — omitted detail)`)
  }
}

async function validatePostState(refCreates: RefAction[]): Promise<void> {
  const headerCodes = [...POLICY_SUMMARY_HEADERS]
  const labels = await loadSummaryHeaderLabels(prisma, headerCodes)

  const okLabels = [...labels.values()].filter((l) => l.labelStatus === "ok")
  const missingLabels = [...labels.values()].filter((l) => l.labelStatus === "missing")

  console.log("\n=== Validation (current DB + planned creates) ===")
  console.log(`Policy header count: ${headerCodes.length} (expected 14)`)

  const existingHeaders = await prisma.product.count({
    where: { code: { in: headerCodes }, deleted: false },
  })

  const allHeaderProducts = await prisma.product.findMany({
    where: { code: { in: headerCodes } },
    select: { code: true, deleted: true, name: true },
  })
  const headerByCode = new Map(allHeaderProducts.map((p) => [p.code, p]))
  let projectedOk = 0
  for (const row of SUMMARY_HEADER_ROWS) {
    const existing = headerByCode.get(row.code)
    if (!existing) {
      projectedOk += 1
      continue
    }
    if (existing.deleted) projectedOk += 1
    else if (existing.name.trim() === row.name || existing.name.trim()) projectedOk += 1
  }

  console.log(`Header Products in DB (active): ${existingHeaders}`)
  console.log(`Projected active headers after apply: ${projectedOk} (expected 14)`)
  console.log(`Labels ok now: ${okLabels.length} / ${headerCodes.length}`)
  if (missingLabels.length > 0) {
    console.log(`Labels missing now: ${missingLabels.map((l) => l.headerCode).join(", ")}`)
  }

  const refs = await prisma.referenceStock.findMany({
    where: { deleted: false },
    select: { productId: true, productGroup: true },
  })
  const refByProductId = new Map<string, ReferenceProductGroupRow[]>()
  for (const ref of refs) {
    const list = refByProductId.get(ref.productId) ?? []
    list.push({ productGroup: ref.productGroup })
    refByProductId.set(ref.productId, list)
  }
  for (const action of refCreates) {
    if (action.action !== "create") continue
    const list = refByProductId.get(action.productId) ?? []
    list.push({ productGroup: action.productGroup })
    refByProductId.set(action.productId, list)
  }

  const mappedProducts = await prisma.product.findMany({
    where: {
      deleted: false,
      OR: [
        ...SHOE_PREFIXES.map((p) => ({ code: { startsWith: p } })),
        ...ADDON_PREFIXES.map((p) => ({ code: { startsWith: p } })),
        { code: { startsWith: SERVICE_PREFIX } },
      ],
    },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  })

  const retiredSet = new Set(MASTER_DATA_CORRECTIONS.retire?.map((r) => r.code) ?? [])
  const plannedRetailCodes = new Set(
    (MASTER_DATA_CORRECTIONS.create ?? []).map((r) => r.code)
  )

  let resolved = 0
  let unresolved = 0
  const unresolvedCodes: string[] = []

  for (const product of mappedProducts) {
    if (isSmokeSku(product.code)) continue
    if (retiredSet.has(product.code)) continue
    const result = resolveToSummaryHeader(product.id, refByProductId)
    if (result) {
      resolved += 1
    } else {
      unresolved += 1
      unresolvedCodes.push(product.code)
    }
  }

  for (const action of refCreates) {
    if (action.action !== "create") continue
    if (!plannedRetailCodes.has(action.productCode)) continue
    resolved += 1
  }

  console.log(`Mapped SKU resolve via helper (projected): ${resolved} ok, ${unresolved} unresolved`)
  if (unresolvedCodes.length > 0) {
    console.log(`  Unresolved: ${unresolvedCodes.join(", ")}`)
  }

  const active70AfterRetire = mappedProducts.filter(
    (p) => p.code.startsWith("70") && !retiredSet.has(p.code) && !isSmokeSku(p.code)
  )
  const unresolved70 = active70AfterRetire.filter(
    (p) => !resolveToSummaryHeader(p.id, refByProductId)
  )
  console.log(`Remaining active 70* service SKUs: ${active70AfterRetire.length}`)
  if (unresolved70.length > 0) {
    console.log(`  70* without projected ref: ${unresolved70.map((p) => p.code).join(", ")}`)
  } else {
    console.log(`  All active 70* projected to 7001900 / 7002900`)
  }

  const sampleResolutions: string[] = []
  for (const product of mappedProducts.slice(0, 5)) {
    const result = resolveToSummaryHeader(product.id, refByProductId)
    if (result) {
      sampleResolutions.push(
        `${product.code} → configured=${result.configured} summary=${result.summaryHeader}`
      )
    }
  }
  if (sampleResolutions.length > 0) {
    console.log("Sample resolutions:")
    for (const line of sampleResolutions) {
      console.log(`  ${line}`)
    }
  }

  const policySet = new Set<string>(POLICY_SUMMARY_HEADERS)
  const outsidePolicy: { productCode: string; productGroup: string; summaryHeader: string }[] = []
  for (const action of refCreates) {
    if (action.action !== "create") continue
    const summaryHeader = normalizeToSummaryHeader(action.productGroup)
    if (summaryHeader && !policySet.has(summaryHeader)) {
      outsidePolicy.push({
        productCode: action.productCode,
        productGroup: action.productGroup,
        summaryHeader,
      })
    }
  }
  if (outsidePolicy.length > 0) {
    console.log(
      `WARNING: ${outsidePolicy.length} planned ref(s) normalize outside 14-policy catalog:`
    )
    for (const row of outsidePolicy) {
      console.log(
        `  ${row.productCode} productGroup=${row.productGroup} → summary=${row.summaryHeader}`
      )
    }
  }
}

async function main() {
  console.log(`Management Product Group backfill — mode: ${APPLY ? "APPLY" : "DRY-RUN"}`)
  console.log(`Policy headers: ${POLICY_SUMMARY_HEADERS.length}`)

  const existingHeaders = await prisma.product.findMany({
    where: { code: { in: SUMMARY_HEADER_ROWS.map((r) => r.code) } },
    select: { code: true, name: true, deleted: true },
  })

  const productActions = planProductHeaders(existingHeaders)
  printProductReport(productActions)

  const correctionCodes = [
    ...(MASTER_DATA_CORRECTIONS.retire?.map((r) => r.code) ?? []),
    ...(MASTER_DATA_CORRECTIONS.rename?.map((r) => r.code) ?? []),
    ...(MASTER_DATA_CORRECTIONS.create?.map((r) => r.code) ?? []),
  ]
  const existingSellables = await prisma.product.findMany({
    where: { code: { in: correctionCodes } },
    select: { code: true, name: true, deleted: true },
  })
  const sellableCorrectionActions = planSellableCorrections(existingSellables)
  printSellableCorrectionReport(sellableCorrectionActions)

  const allRefs = await prisma.referenceStock.findMany({
    select: {
      productId: true,
      hookGroup: true,
      deleted: true,
      productGroup: true,
    },
  })
  const refsByProductId = new Map<
    string,
    { deleted: boolean; productGroup: string | null; hookGroup: string }[]
  >()
  for (const ref of allRefs) {
    const list = refsByProductId.get(ref.productId) ?? []
    list.push(ref)
    refsByProductId.set(ref.productId, list)
  }

  const shoeProducts = await prisma.product.findMany({
    where: {
      deleted: false,
      OR: SHOE_PREFIXES.map((prefix) => ({ code: { startsWith: prefix } })),
    },
    select: { id: true, code: true },
    orderBy: { code: "asc" },
  })

  const addonProducts = await prisma.product.findMany({
    where: {
      deleted: false,
      OR: ADDON_PREFIXES.map((prefix) => ({ code: { startsWith: prefix } })),
    },
    select: { id: true, code: true },
    orderBy: { code: "asc" },
  })

  const serviceProducts = await prisma.product.findMany({
    where: { deleted: false, code: { startsWith: SERVICE_PREFIX } },
    select: { id: true, code: true },
    orderBy: { code: "asc" },
  })

  const shoePlan = await planReferenceStockCreates({
    products: shoeProducts,
    refsByProductId,
    hookGroup: "S",
    resolveGroup: resolveShoeProductGroup,
  })

  const oHookStart = await getNextHookNo(prisma, "O")

  let addonPlan = await planReferenceStockCreates({
    products: addonProducts,
    refsByProductId,
    hookGroup: "O",
    resolveGroup: resolveAddonProductGroup,
    startHookNo: oHookStart,
  })

  const plannedRetail = appendPlannedRetailRefCreates(
    addonPlan.actions,
    sellableCorrectionActions,
    addonPlan.nextHookNo
  )
  addonPlan = { actions: plannedRetail.actions, nextHookNo: plannedRetail.nextHookNo }

  const servicePlan = await planReferenceStockCreates({
    products: serviceProducts,
    refsByProductId,
    hookGroup: "O",
    resolveGroup: resolveServiceProductGroup,
    startHookNo: addonPlan.nextHookNo,
  })

  printRefReport("shoe materials (51/55/61/65, hookGroup S)", shoePlan.actions)
  printRefReport("keys add-on + retail (41/80, hookGroup O)", addonPlan.actions)
  printRefReport("shoe services (70*, hookGroup O)", servicePlan.actions)

  const allRefCreates = [
    ...shoePlan.actions,
    ...addonPlan.actions,
    ...servicePlan.actions,
  ].filter((a): a is Extract<RefAction, { action: "create" }> => a.action === "create")

  const productMutations = productActions.filter(
    (a) => a.action === "create" || a.action === "undelete"
  )
  const sellableMutations = sellableCorrectionActions.filter(
    (a) => a.action === "retire" || a.action === "rename" || a.action === "create"
  )

  console.log("\n=== Totals ===")
  console.log(`Summary header Product mutations: ${productMutations.length} (policy count stays 14)`)
  console.log(`Sellable Product corrections: ${sellableMutations.length}`)
  console.log(`ReferenceStock creates: ${allRefCreates.length}`)
  console.log(`Key ReferenceStock rows: unchanged (595 existing key refs not touched)`)

  await validatePostState(allRefCreates)

  if (!APPLY) {
    console.log("\nDRY-RUN complete — no database writes.")
    console.log("Re-run with --apply after HO approval to execute mutations.")
    return
  }

  console.log("\nApplying mutations…")
  await applyProductHeaders(productActions)
  await applySellableCorrections(sellableCorrectionActions)

  const addonProductsAfter = await prisma.product.findMany({
    where: {
      deleted: false,
      OR: ADDON_PREFIXES.map((prefix) => ({ code: { startsWith: prefix } })),
    },
    select: { id: true, code: true },
    orderBy: { code: "asc" },
  })
  const addonPlanAfter = await planReferenceStockCreates({
    products: addonProductsAfter,
    refsByProductId,
    hookGroup: "O",
    resolveGroup: resolveAddonProductGroup,
    startHookNo: oHookStart,
  })

  await applyReferenceStock([
    ...shoePlan.actions,
    ...addonPlanAfter.actions,
    ...servicePlan.actions,
  ])
  console.log("Apply complete.")
}

const isDirectRun = process.argv[1]?.replace(/\\/g, "/").includes("seed-management-product-group-backfill")

if (isDirectRun) {
  main()
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
