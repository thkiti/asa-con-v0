/**
 * Phase 15C manual smoke test runner (API-level).
 * Usage: FINANCE_POSTING_ENABLED=true npx tsx scripts/smoke-finance-period.ts
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { BranchType, ProductType, Role, AccountingPeriodStatus } from "../generated/prisma/client"
import { prisma } from "../lib/shared/prisma"
import { DEFAULT_ACCOUNT_CODES } from "../lib/finance/account-map"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "../lib/legal-entity/constants"
import { GlAccountType } from "../generated/prisma/client"

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"

type Result = { name: string; pass: boolean; detail: string }

const results: Result[] = []
function record(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail })
  console.log(`${pass ? "PASS" : "FAIL"} | ${name} | ${detail}`)
}

function currentPeriodKey(): string {
  return new Date().toISOString().slice(0, 7)
}

/** Smoke runs reuse the current month; reset closed rows so lifecycle can rerun (dev DB only). */
async function prepareSmokePeriod(branchId: string): Promise<string> {
  const periodKey = currentPeriodKey()
  const period = await prisma.accountingPeriod.findUnique({
    where: {
      legalEntityCode_periodKey: {
        legalEntityCode: DEFAULT_DOCUMENT_ENTITY_CODE,
        periodKey,
      },
    },
  })
  if (period && period.status !== AccountingPeriodStatus.OPEN) {
    await prisma.accountingPeriod.update({
      where: { id: period.id },
      data: { status: AccountingPeriodStatus.OPEN, closedAt: null },
    })
  }
  return periodKey
}

function cookieHeader(role: string, branchId: string, staffId = "smoke-staff-1") {
  return `sessionId=smoke-session; role=${role}; staffId=${staffId}; staffName=Smoke Tester; branchId=${branchId}`
}

async function api(
  path: string,
  init: RequestInit & { role?: string; branchId?: string } = {}
) {
  const headers = new Headers(init.headers)
  headers.set("content-type", "application/json")
  if (init.role && init.branchId) {
    headers.set("cookie", cookieHeader(init.role, init.branchId))
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  const text = await res.text()
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    // keep text
  }
  return { status: res.status, body }
}

async function seedIfNeeded() {
  let branch = await prisma.branch.findFirst({ where: { deleted: false, isActive: true } })
  if (!branch) {
    branch = await prisma.branch.create({
      data: { code: "SMOKE01", name: "Smoke Test Shop", type: BranchType.SH },
    })
  }

  let product = await prisma.product.findFirst({ where: { deleted: false, productType: ProductType.TRACKED } })
  if (!product) {
    product = await prisma.product.create({
      data: {
        groupCode: 99,
        typeCode: 1,
        runningCode: 1,
        code: "SMOKE-PROD-001",
        name: "Smoke Test Product",
        productType: ProductType.TRACKED,
      },
    })
  }

  await prisma.stock.upsert({
    where: { branchId_productId: { branchId: branch.id, productId: product.id } },
    create: { branchId: branch.id, productId: product.id, qty: 100, avgCost: 10 },
    update: { qty: 100, avgCost: 10 },
  })

  const glRows = [
    { code: DEFAULT_ACCOUNT_CODES.INVENTORY, name: "Inventory", accountType: GlAccountType.ASSET },
    { code: DEFAULT_ACCOUNT_CODES.CASH, name: "Cash", accountType: GlAccountType.ASSET },
    { code: DEFAULT_ACCOUNT_CODES.CARD_CLEARING, name: "Card clearing", accountType: GlAccountType.ASSET },
    { code: DEFAULT_ACCOUNT_CODES.REVENUE, name: "Sales revenue", accountType: GlAccountType.REVENUE },
    { code: DEFAULT_ACCOUNT_CODES.COGS, name: "COGS", accountType: GlAccountType.EXPENSE },
    { code: DEFAULT_ACCOUNT_CODES.AP, name: "AP", accountType: GlAccountType.LIABILITY },
  ]
  for (const row of glRows) {
    await prisma.glAccount.upsert({
      where: { code: row.code },
      create: { ...row, isActive: true, deleted: false },
      update: { name: row.name, accountType: row.accountType, isActive: true, deleted: false },
    })
  }

  // Period rows with vouchers cannot be deleted (FK). Caller picks a reusable key.
  return { branchId: branch.id, productId: product.id }
}

async function countFinanceForSale(saleId: string | null) {
  if (!saleId) return { vouchers: 0, journals: 0, sales: 0 }
  const vouchers = await prisma.voucher.count({ where: { refId: saleId } })
  const journals = await prisma.journalEntry.count({ where: { voucher: { refId: saleId } } })
  const sales = await prisma.sale.count({ where: { id: saleId } })
  return { vouchers, journals, sales }
}

async function tryCheckout(branchId: string, productId: string) {
  return api("/api/pos/checkout", {
    method: "POST",
    body: JSON.stringify({
      branchId,
      staffId: "smoke-staff-1",
      paymentMethod: "CASH",
      paidAmount: 100,
      lines: [{ productId, qty: 1 }],
    }),
  })
}

async function waitForServer(maxMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${BASE}/api/health`)
      if (res.ok) return true
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

async function main() {
  console.log(`Smoke test base: ${BASE}`)
  console.log(`FINANCE_POSTING_ENABLED (script env): ${process.env.FINANCE_POSTING_ENABLED}`)

  if (!(await waitForServer())) {
    record("Server ready", false, "Dev server not reachable at /api/health")
    process.exitCode = 1
    return
  }
  record("Server ready", true, `${BASE}/api/health OK`)

  const { branchId, productId } = await seedIfNeeded()
  record("Seed data", true, `branch=${branchId} product=${productId}`)

  const PERIOD_KEY = await prepareSmokePeriod(branchId)
  console.log(`Period key: ${PERIOD_KEY}`)

  // G: GET without auth
  const getPublic = await api(`/api/finance/periods?branchId=${branchId}&periodKey=${PERIOD_KEY}`)
  record("G GET public list", getPublic.status === 200, `status=${getPublic.status}`)

  // G: POST unauthorized
  const postUnauth = await api("/api/finance/periods", {
    method: "POST",
    body: JSON.stringify({ branchId, periodKey: PERIOD_KEY }),
  })
  record(
    "G POST unauthorized",
    postUnauth.status === 401 && (postUnauth.body as { code?: string }).code === "UNAUTHENTICATED",
    `status=${postUnauth.status} code=${(postUnauth.body as { code?: string }).code}`
  )

  // G: PATCH SH_STAFF forbidden
  const patchStaff = await api("/api/finance/periods", {
    method: "PATCH",
    role: "SH_STAFF",
    branchId,
    body: JSON.stringify({ branchId, periodKey: PERIOD_KEY, action: "SOFT_CLOSE" }),
  })
  record(
    "G PATCH SH_STAFF forbidden",
    patchStaff.status === 403 && (patchStaff.body as { code?: string }).code === "FORBIDDEN",
    `status=${patchStaff.status} code=${(patchStaff.body as { code?: string }).code}`
  )

  // A: Create/open period
  const postOpen = await api("/api/finance/periods", {
    method: "POST",
    role: "HO_FINANCE",
    branchId,
    body: JSON.stringify({ branchId, periodKey: PERIOD_KEY }),
  })
  const period1 = (postOpen.body as { period?: { status?: string; openedAt?: string } }).period
  record(
    "A Create/open period",
    postOpen.status === 200 && period1?.status === "OPEN" && Boolean(period1?.openedAt),
    `status=${postOpen.status} periodStatus=${period1?.status}`
  )

  const postDup = await api("/api/finance/periods", {
    method: "POST",
    role: "HO_FINANCE",
    branchId,
    body: JSON.stringify({ branchId, periodKey: PERIOD_KEY }),
  })
  const periodDup = (postDup.body as { period?: { id?: string } }).period
  record(
    "A Idempotent create",
    postDup.status === 200 && periodDup?.id === (postOpen.body as { period?: { id?: string } }).period?.id,
    `sameId=${periodDup?.id === (postOpen.body as { period?: { id?: string } }).period?.id}`
  )

  const periodCount = await prisma.accountingPeriod.count({ where: { branchId, periodKey: PERIOD_KEY } })
  record("A No duplicate rows", periodCount === 1, `count=${periodCount}`)

  // D prep: posting while OPEN should succeed (if finance enabled on server)
  const beforeOpenSale = await prisma.sale.count()
  const beforeOpenVouchers = await prisma.voucher.count()
  const checkoutOpen = await tryCheckout(branchId, productId)
  const openSaleId = (checkoutOpen.body as { sale?: { id?: string } })?.sale?.id ?? null
  const afterOpenSale = await prisma.sale.count()
  const afterOpenVouchers = await prisma.voucher.count()
  record(
    "D Posting OPEN allowed",
    checkoutOpen.status === 200 && afterOpenSale === beforeOpenSale + 1 && afterOpenVouchers > beforeOpenVouchers,
    `checkout=${checkoutOpen.status} saleCreated=${afterOpenSale - beforeOpenSale} vouchers+${afterOpenVouchers - beforeOpenVouchers}`
  )

  // B: SOFT CLOSE
  const patchSoft = await api("/api/finance/periods", {
    method: "PATCH",
    role: "HO_FINANCE",
    branchId,
    body: JSON.stringify({ branchId, periodKey: PERIOD_KEY, action: "SOFT_CLOSE" }),
  })
  const softPeriod = (patchSoft.body as { period?: { status?: string; closedAt?: string | null } }).period
  record(
    "B SOFT CLOSE",
    patchSoft.status === 200 && softPeriod?.status === "SOFT_CLOSED" && Boolean(softPeriod?.closedAt),
    `status=${softPeriod?.status} closedAt=${softPeriod?.closedAt}`
  )

  // C: posting blocked SOFT
  const beforeSoftSales = await prisma.sale.count()
  const beforeSoftVouchers = await prisma.voucher.count()
  const checkoutSoft = await tryCheckout(branchId, productId)
  const softErr = checkoutSoft.body as { code?: string; error?: string }
  const afterSoftSales = await prisma.sale.count()
  const afterSoftVouchers = await prisma.voucher.count()
  record(
    "C Posting SOFT blocked",
    checkoutSoft.status !== 200 &&
      (softErr.code === "PERIOD_CLOSED" || String(softErr.error ?? "").toLowerCase().includes("period closed")) &&
      afterSoftSales === beforeSoftSales &&
      afterSoftVouchers === beforeSoftVouchers,
    `checkout=${checkoutSoft.status} code=${softErr.code} salesDelta=${afterSoftSales - beforeSoftSales}`
  )

  // H: idempotent SOFT on SOFT
  const patchSoftAgain = await api("/api/finance/periods", {
    method: "PATCH",
    role: "HO_FINANCE",
    branchId,
    body: JSON.stringify({ branchId, periodKey: PERIOD_KEY, action: "SOFT_CLOSE" }),
  })
  record(
    "H Idempotent SOFT CLOSE",
    patchSoftAgain.status === 200 &&
      (patchSoftAgain.body as { period?: { status?: string } }).period?.status === "SOFT_CLOSED",
    `status=${patchSoftAgain.status}`
  )

  // D: REOPEN
  const patchReopen = await api("/api/finance/periods", {
    method: "PATCH",
    role: "HO_FINANCE",
    branchId,
    body: JSON.stringify({ branchId, periodKey: PERIOD_KEY, action: "REOPEN" }),
  })
  const reopenPeriod = (patchReopen.body as { period?: { status?: string; closedAt?: string | null } }).period
  record(
    "D REOPEN",
    patchReopen.status === 200 && reopenPeriod?.status === "OPEN" && reopenPeriod?.closedAt === null,
    `status=${reopenPeriod?.status} closedAt=${reopenPeriod?.closedAt}`
  )

  const checkoutReopen = await tryCheckout(branchId, productId)
  record(
    "D Posting after REOPEN",
    checkoutReopen.status === 200,
    `checkout=${checkoutReopen.status}`
  )

  // H: idempotent REOPEN on OPEN
  const patchReopenAgain = await api("/api/finance/periods", {
    method: "PATCH",
    role: "HO_FINANCE",
    branchId,
    body: JSON.stringify({ branchId, periodKey: PERIOD_KEY, action: "REOPEN" }),
  })
  record(
    "H Idempotent REOPEN on OPEN",
    patchReopenAgain.status === 200 &&
      (patchReopenAgain.body as { period?: { status?: string } }).period?.status === "OPEN",
    `status=${patchReopenAgain.status}`
  )

  // E: HARD CLOSE
  const patchHard = await api("/api/finance/periods", {
    method: "PATCH",
    role: "HO_FINANCE",
    branchId,
    body: JSON.stringify({ branchId, periodKey: PERIOD_KEY, action: "HARD_CLOSE" }),
  })
  const hardPeriod = (patchHard.body as { period?: { status?: string; closedAt?: string | null } }).period
  record(
    "E HARD CLOSE",
    patchHard.status === 200 && hardPeriod?.status === "HARD_CLOSED" && Boolean(hardPeriod?.closedAt),
    `status=${hardPeriod?.status}`
  )

  // F: posting blocked HARD
  const beforeHardSales = await prisma.sale.count()
  const beforeHardVouchers = await prisma.voucher.count()
  const checkoutHard = await tryCheckout(branchId, productId)
  const hardErr = checkoutHard.body as { code?: string; error?: string }
  const afterHardSales = await prisma.sale.count()
  const afterHardVouchers = await prisma.voucher.count()
  record(
    "F Posting HARD blocked",
    checkoutHard.status !== 200 &&
      (hardErr.code === "PERIOD_CLOSED" || String(hardErr.error ?? "").toLowerCase().includes("period closed")) &&
      afterHardSales === beforeHardSales &&
      afterHardVouchers === beforeHardVouchers,
    `checkout=${checkoutHard.status} code=${hardErr.code}`
  )

  // H: idempotent HARD on HARD
  const patchHardAgain = await api("/api/finance/periods", {
    method: "PATCH",
    role: "HO_FINANCE",
    branchId,
    body: JSON.stringify({ branchId, periodKey: PERIOD_KEY, action: "HARD_CLOSE" }),
  })
  record(
    "H Idempotent HARD CLOSE",
    patchHardAgain.status === 200 &&
      (patchHardAgain.body as { period?: { status?: string } }).period?.status === "HARD_CLOSED",
    `status=${patchHardAgain.status}`
  )

  const failed = results.filter((r) => !r.pass)
  console.log("\n--- Summary ---")
  console.log(`Passed: ${results.length - failed.length}/${results.length}`)
  if (failed.length) {
    console.log("Failed:")
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
    process.exitCode = 1
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
