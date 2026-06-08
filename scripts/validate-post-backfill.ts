/**
 * Post-apply validation for management product group backfill.
 * Mapped SKU resolution (113) is the target; active refs (710) may exceed the
 * dry-run create projection when legacy misclassified rows gain coverage.
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import {
  POLICY_SUMMARY_HEADERS,
  loadSummaryHeaderLabels,
  resolveToSummaryHeader,
  type ReferenceProductGroupRow,
} from "../lib/product-groups/management-product-group"
import { prisma } from "../lib/shared/prisma"

const SHOE_PREFIXES = ["51", "55", "61", "65"]
const ADDON_PREFIXES = ["41", "80"]
const SERVICE_PREFIX = "70"
const RETIRED = new Set(["7003001", "7003002", "7003003"])

async function main() {
  const results: { check: string; pass: boolean; detail: string }[] = []

  const headerCount = await prisma.product.count({
    where: { code: { in: [...POLICY_SUMMARY_HEADERS] }, deleted: false },
  })
  const labels = await loadSummaryHeaderLabels(prisma, POLICY_SUMMARY_HEADERS)
  const labelsOk = [...labels.values()].filter((l) => l.labelStatus === "ok").length
  results.push({
    check: "14 policy headers exist",
    pass: headerCount === 14 && labelsOk === 14,
    detail: `active=${headerCount}, labelsOk=${labelsOk}/14`,
  })

  const bad3900 = await prisma.product.count({
    where: { OR: [{ code: "7003900" }, { code: { startsWith: "70039" } }] },
  })
  results.push({
    check: "7003900 does not exist",
    pass: bad3900 === 0,
    detail: `rows=${bad3900}`,
  })

  const refs = await prisma.referenceStock.findMany({
    where: { deleted: false },
    select: { productId: true, productCode: true, productGroup: true, hookGroup: true },
  })
  const refByProductId = new Map<string, ReferenceProductGroupRow[]>()
  for (const ref of refs) {
    const list = refByProductId.get(ref.productId) ?? []
    list.push({ productGroup: ref.productGroup })
    refByProductId.set(ref.productId, list)
  }

  const active70 = await prisma.product.findMany({
    where: { deleted: false, code: { startsWith: SERVICE_PREFIX } },
    select: { id: true, code: true },
    orderBy: { code: "asc" },
  })
  const headerSet = new Set<string>(POLICY_SUMMARY_HEADERS)
  const active70Services = active70.filter((p) => !RETIRED.has(p.code) && !headerSet.has(p.code))
  const bad70: string[] = []
  for (const p of active70Services) {
    const resolved = resolveToSummaryHeader(p.id, refByProductId)
    if (!resolved || !["7001900", "7002900"].includes(resolved.summaryHeader)) {
      bad70.push(`${p.code}→${resolved?.summaryHeader ?? "unresolved"}`)
    }
  }
  results.push({
    check: "active 70* resolve to 7001900/7002900 only",
    pass: bad70.length === 0,
    detail: bad70.length ? bad70.join(", ") : `${active70Services.length} ok`,
  })

  const active80 = await prisma.product.findMany({
    where: { deleted: false, code: { startsWith: "80" } },
    select: { id: true, code: true },
    orderBy: { code: "asc" },
  }).then((rows) => rows.filter((p) => !headerSet.has(p.code)))
  const bad80: string[] = []
  for (const p of active80) {
    const resolved = resolveToSummaryHeader(p.id, refByProductId)
    if (!resolved || resolved.summaryHeader !== "8001900") {
      bad80.push(`${p.code}→${resolved?.summaryHeader ?? "unresolved"}`)
    }
  }
  results.push({
    check: "active 80* resolve to 8001900",
    pass: bad80.length === 0,
    detail: bad80.length ? bad80.join(", ") : `${active80.length} ok`,
  })

  const target80 = ["8001007", "8001008", "8001009"]
  const targetRefs = refs.filter((r) => target80.includes(r.productCode))
  const targetOk = target80.every((code) =>
    targetRefs.some((r) => r.productCode === code && r.productGroup === "8001900")
  )
  results.push({
    check: "8001007/8001008/8001009 productGroup=8001900",
    pass: targetOk,
    detail: targetRefs.map((r) => `${r.productCode}=${r.productGroup}`).join(", "),
  })

  const mappedProducts = await prisma.product.findMany({
    where: {
      deleted: false,
      OR: [
        ...SHOE_PREFIXES.map((p) => ({ code: { startsWith: p } })),
        ...ADDON_PREFIXES.map((p) => ({ code: { startsWith: p } })),
        { code: { startsWith: SERVICE_PREFIX } },
      ],
    },
    select: { id: true, code: true },
  })
  let resolved = 0
  let unresolved: string[] = []
  for (const p of mappedProducts) {
    if (RETIRED.has(p.code) || headerSet.has(p.code)) continue
    if (resolveToSummaryHeader(p.id, refByProductId)) resolved += 1
    else unresolved.push(p.code)
  }
  results.push({
    check: "helper resolves 113 mapped SKUs",
    pass: resolved === 113 && unresolved.length === 0,
    detail: `resolved=${resolved}, unresolved=${unresolved.join(", ") || "none"}`,
  })

  const keyRefCount = await prisma.referenceStock.count({
    where: { deleted: false, hookGroup: { in: ["K", "C", "M"] } },
  })
  results.push({
    check: "595 key refs preserved",
    pass: keyRefCount === 595,
    detail: `K/C/M active refs=${keyRefCount}`,
  })

  const [productTotal, refTotal, refActive] = await Promise.all([
    prisma.product.count(),
    prisma.referenceStock.count(),
    prisma.referenceStock.count({ where: { deleted: false } }),
  ])

  const retired = await prisma.product.findMany({
    where: { code: { in: ["7003001", "7003002", "7003003"] } },
    select: { code: true, deleted: true },
  })
  const created80 = await prisma.product.findMany({
    where: { code: { in: ["8001008", "8001009"] } },
    select: { code: true, name: true, deleted: true },
  })
  const renamed = await prisma.product.findUnique({
    where: { code: "8001007" },
    select: { code: true, name: true, deleted: true },
  })

  console.log("POST-APPLY VALIDATION")
  console.log("counts:", { productTotal, refTotal, refActive })
  console.log("retired:", retired)
  console.log("created:", created80)
  console.log("renamed:", renamed)
  console.log("")
  let allPass = true
  for (const row of results) {
    console.log(`${row.pass ? "PASS" : "FAIL"}  ${row.check}  —  ${row.detail}`)
    if (!row.pass) allPass = false
  }
  console.log("")
  console.log(allPass ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED")
  if (!allPass) process.exit(1)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
