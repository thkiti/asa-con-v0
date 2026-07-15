/**
 * Post-cleanup verification for SMOKE01 removal (read-only).
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { prisma } from "@/lib/shared/prisma"
import { verifySmoke01Gone } from "@/lib/dev/smoke01-cleanup"
import { listActiveShopBranches } from "@/lib/shop/sales-targets"

async function main() {
  const verify = await verifySmoke01Gone(prisma)
  const shops = await listActiveShopBranches(prisma)
  const smokeInSelector = shops.filter((b) => b.code === "SMOKE01")
  const protectedSample = await prisma.branch.findMany({
    where: {
      code: { in: ["HO999", "SH001", "SH002", "SH030"] },
      deleted: false,
    },
    select: { code: true, name: true, isActive: true },
    orderBy: { code: "asc" },
  })
  const dev = await prisma.staff.findFirst({
    where: { staffId: "DEV" },
    select: {
      staffId: true,
      branch: { select: { code: true } },
      deleted: true,
    },
  })
  const periods = await prisma.accountingPeriod.findMany({
    where: {
      legalEntityCode: "AS",
      periodKey: { in: ["2026-05", "2026-06", "2026-07"] },
    },
    select: {
      periodKey: true,
      status: true,
      branch: { select: { code: true } },
    },
    orderBy: { periodKey: "asc" },
  })
  const financeVouchers = await prisma.voucher.count({
    where: {
      OR: [
        { refNo: { contains: "SMOKE01" } },
        { voucherNo: { in: ["V-2026-07-00001", "V-2026-07-00002"] } },
      ],
    },
  })
  const leftoverSales = await prisma.sale.count({
    where: { staffId: { startsWith: "smoke-staff" } },
  })

  console.log(
    JSON.stringify(
      {
        verify,
        smokeInShopSelector: smokeInSelector,
        protectedBranchesPresent: protectedSample,
        devStaff: dev,
        periodsRehomed: periods,
        financeVouchersMatchingSmoke: financeVouchers,
        leftoverSmokeStaffSales: leftoverSales,
      },
      null,
      2
    )
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
