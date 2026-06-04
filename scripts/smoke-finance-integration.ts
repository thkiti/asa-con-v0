import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })
process.env.FINANCE_POSTING_ENABLED = "true"

import { BranchType, ProductType, GlAccountType, AccountingPeriodStatus } from "../generated/prisma/client"
import { ensureDevPeriodAdminStaff } from "../lib/auth/period-admin-staff"
import { prisma } from "../lib/shared/prisma"
import { DEFAULT_ACCOUNT_CODES } from "../lib/finance/account-map"
import { checkout } from "../lib/pos/checkout"

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"
const results: { name: string; pass: boolean; detail: string }[] = []
function record(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail })
  console.log(`${pass ? "PASS" : "FAIL"} | ${name} | ${detail}`)
}

function currentPeriodKey(): string {
  return new Date().toISOString().slice(0, 7)
}

/** Reset closed period to OPEN so smoke lifecycle can rerun (dev DB only). */
async function prepareSmokePeriod(branchId: string): Promise<string> {
  const periodKey = currentPeriodKey()
  const period = await prisma.accountingPeriod.findUnique({
    where: { branchId_periodKey: { branchId, periodKey } },
  })
  if (period && period.status !== AccountingPeriodStatus.OPEN) {
    await prisma.accountingPeriod.update({
      where: { id: period.id },
      data: { status: AccountingPeriodStatus.OPEN, closedAt: null },
    })
  }
  return periodKey
}

async function seed() {
  let branch = await prisma.branch.findFirst({ where: { code: "SMOKE01" } })
  if (!branch) {
    branch = await prisma.branch.create({
      data: { code: "SMOKE01", name: "Smoke Test Shop", type: BranchType.SH },
    })
  }
  let product = await prisma.product.findFirst({ where: { code: "SMOKE-PROD-001" } })
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
    update: { qty: 100 },
  })
  const glRows = [
    { code: DEFAULT_ACCOUNT_CODES.INVENTORY, name: "Inventory", accountType: GlAccountType.ASSET },
    { code: DEFAULT_ACCOUNT_CODES.CASH, name: "Cash", accountType: GlAccountType.ASSET },
    { code: DEFAULT_ACCOUNT_CODES.CARD_CLEARING, name: "Card", accountType: GlAccountType.ASSET },
    { code: DEFAULT_ACCOUNT_CODES.REVENUE, name: "Revenue", accountType: GlAccountType.REVENUE },
    { code: DEFAULT_ACCOUNT_CODES.COGS, name: "COGS", accountType: GlAccountType.EXPENSE },
    { code: DEFAULT_ACCOUNT_CODES.AP, name: "AP", accountType: GlAccountType.LIABILITY },
  ]
  for (const row of glRows) {
    await prisma.glAccount.upsert({
      where: { code: row.code },
      create: { ...row, isActive: true, deleted: false },
      update: { isActive: true, deleted: false },
    })
  }
  return { branchId: branch.id, productId: product.id }
}

async function counts() {
  return {
    sales: await prisma.sale.count(),
    vouchers: await prisma.voucher.count(),
    journals: await prisma.journalEntry.count(),
  }
}

async function tryCheckout(branchId: string, productId: string) {
  try {
    await checkout({
      branchId,
      staffId: "smoke-staff",
      paymentMethod: "CASH",
      paidAmount: 100,
      lines: [{ productId, qty: 1 }],
    })
    return { ok: true as const }
  } catch (err) {
    return {
      ok: false as const,
      message: err instanceof Error ? err.message : String(err),
      code: (err as { code?: string }).code,
    }
  }
}

async function main() {
  const { branchId, productId } = await seed()
  const PERIOD_KEY = await prepareSmokePeriod(branchId)
  console.log(`Period key: ${PERIOD_KEY}`)

  const httpRes = await fetch(`${BASE}/api/finance/periods?branchId=${branchId}`, {
    headers: { cookie: `sessionId=s1; role=HO_FINANCE; staffId=st1; staffName=T; branchId=${branchId}` },
  })
  const httpText = await httpRes.text()
  record(
    "HTTP GET /api/finance/periods returns JSON",
    httpText.trimStart().startsWith("{"),
    httpText.trimStart().startsWith("{") ? "JSON OK" : "HTML redirect — middleware blocks finance API"
  )

  const { bootstrapPeriodIfMissing } = await import("../lib/finance/period-setup")
  const { closeAccountingPeriod, reopenAccountingPeriod } = await import("../lib/finance/period-close")

  await prisma.$transaction((tx) => bootstrapPeriodIfMissing(tx, { branchId, periodKey: PERIOD_KEY }))
  const openPeriod = await prisma.accountingPeriod.findUnique({
    where: { branchId_periodKey: { branchId, periodKey: PERIOD_KEY } },
  })
  record("A Period OPEN", openPeriod?.status === "OPEN", `status=${openPeriod?.status}`)

  await prisma.$transaction((tx) => bootstrapPeriodIfMissing(tx, { branchId, periodKey: PERIOD_KEY }))
  const dupCount = await prisma.accountingPeriod.count({ where: { branchId, periodKey: PERIOD_KEY } })
  record("A/H Idempotent bootstrap", dupCount === 1, `count=${dupCount}`)

  const beforeOpen = await counts()
  const openCheckout = await tryCheckout(branchId, productId)
  const afterOpen = await counts()
  record(
    "D OPEN posting succeeds",
    openCheckout.ok && afterOpen.sales === beforeOpen.sales + 1 && afterOpen.vouchers > beforeOpen.vouchers,
    `sales+${afterOpen.sales - beforeOpen.sales} vouchers+${afterOpen.vouchers - beforeOpen.vouchers}`
  )

  await prisma.$transaction((tx) => closeAccountingPeriod(tx, { branchId, periodKey: PERIOD_KEY, mode: "SOFT" }))
  const soft = await prisma.accountingPeriod.findUnique({ where: { branchId_periodKey: { branchId, periodKey: PERIOD_KEY } } })
  record("B SOFT CLOSE", soft?.status === "SOFT_CLOSED" && Boolean(soft?.closedAt), `status=${soft?.status}`)

  const beforeSoft = await counts()
  const softCheckout = await tryCheckout(branchId, productId)
  const afterSoft = await counts()
  record(
    "C SOFT blocks posting + rollback",
    !softCheckout.ok && softCheckout.code === "PERIOD_CLOSED" && afterSoft.sales === beforeSoft.sales && afterSoft.vouchers === beforeSoft.vouchers,
    `code=${softCheckout.code} salesDelta=${afterSoft.sales - beforeSoft.sales}`
  )

  await prisma.$transaction((tx) => closeAccountingPeriod(tx, { branchId, periodKey: PERIOD_KEY, mode: "SOFT" }))
  record("H Idempotent SOFT CLOSE", true, "ok")

  const smokeStaffId = await ensureDevPeriodAdminStaff(prisma, branchId)
  const smokeStaff = await prisma.staff.findUnique({
    where: { id: smokeStaffId },
    select: { name: true },
  })
  const smokeReopenBy = {
    staffId: smokeStaffId,
    name: smokeStaff?.name ?? "Dev Admin",
    role: "HO_ADMIN" as const,
  }
  await prisma.$transaction((tx) =>
    reopenAccountingPeriod(tx, {
      branchId,
      periodKey: PERIOD_KEY,
      reason: "Smoke integration reopen",
      reopenedBy: smokeReopenBy,
    })
  )
  const reopened = await prisma.accountingPeriod.findUnique({ where: { branchId_periodKey: { branchId, periodKey: PERIOD_KEY } } })
  record("D REOPEN", reopened?.status === "OPEN" && reopened?.closedAt === null, `status=${reopened?.status}`)

  const reopenCheckout = await tryCheckout(branchId, productId)
  record("D Posting after REOPEN", reopenCheckout.ok, `ok=${reopenCheckout.ok}`)

  await prisma.$transaction((tx) =>
    reopenAccountingPeriod(tx, {
      branchId,
      periodKey: PERIOD_KEY,
      reason: "Smoke idempotent reopen",
      reopenedBy: smokeReopenBy,
    })
  )
  record("H Idempotent REOPEN", true, "ok")

  const smokeClosedBy = {
    staffId: smokeStaffId,
    name: smokeStaff?.name ?? "Dev Admin",
    role: "HO_ADMIN" as const,
  }

  await prisma.$transaction((tx) =>
    closeAccountingPeriod(tx, {
      branchId,
      periodKey: PERIOD_KEY,
      mode: "HARD",
      closedBy: smokeClosedBy,
    })
  )
  const hard = await prisma.accountingPeriod.findUnique({ where: { branchId_periodKey: { branchId, periodKey: PERIOD_KEY } } })
  record("E HARD CLOSE", hard?.status === "HARD_CLOSED", `status=${hard?.status}`)

  const beforeHard = await counts()
  const hardCheckout = await tryCheckout(branchId, productId)
  const afterHard = await counts()
  record(
    "F HARD blocks posting + rollback",
    !hardCheckout.ok && hardCheckout.code === "PERIOD_CLOSED" && afterHard.sales === beforeHard.sales && afterHard.vouchers === beforeHard.vouchers,
    `code=${hardCheckout.code}`
  )

  await prisma.$transaction((tx) =>
    closeAccountingPeriod(tx, {
      branchId,
      periodKey: PERIOD_KEY,
      mode: "HARD",
      closedBy: smokeClosedBy,
    })
  )
  record("H Idempotent HARD CLOSE", true, "ok")

  const failed = results.filter((r) => !r.pass)
  console.log(`\n--- ${results.length - failed.length}/${results.length} passed ---`)
  if (failed.length) process.exitCode = 1
}

main().finally(() => prisma.$disconnect())
