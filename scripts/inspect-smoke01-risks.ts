/**
 * Read-only follow-up for SMOKE01 risk fields (DEV staff, accounting periods).
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { prisma } from "@/lib/shared/prisma"

async function main() {
  const smoke = await prisma.branch.findFirst({
    where: { code: "SMOKE01" },
    select: { id: true },
  })
  if (!smoke) {
    console.log("SMOKE01 gone")
    return
  }
  const ho = await prisma.branch.findFirst({
    where: { code: "HO999", deleted: false },
    select: { id: true, code: true },
  })
  const periods = await prisma.accountingPeriod.findMany({
    where: { branchId: smoke.id },
    select: {
      id: true,
      periodKey: true,
      status: true,
      legalEntityCode: true,
    },
  })
  const snaps = await prisma.reconciliationSnapshot.findMany({
    where: { branchId: smoke.id },
    select: { id: true, periodKey: true },
  })
  const closeEv = await prisma.accountingPeriodCloseEvidence.count({
    where: { branchId: smoke.id },
  })
  const reopenEv = await prisma.accountingPeriodReopenEvidence.count({
    where: { branchId: smoke.id },
  })
  const reopenReq = await prisma.accountingPeriodReopenRequest.count({
    where: { branchId: smoke.id },
  })
  const periodJournals = await prisma.journalEntry.count({
    where: { periodId: { in: periods.map((p) => p.id) } },
  })
  const periodVouchers = await prisma.voucher.count({
    where: { periodId: { in: periods.map((p) => p.id) } },
  })
  const smokeOnlyVouchers = await prisma.voucher.count({
    where: { branchId: smoke.id },
  })
  const otherBranchVouchersOnThosePeriods = await prisma.voucher.count({
    where: {
      periodId: { in: periods.map((p) => p.id) },
      branchId: { not: smoke.id },
    },
  })
  const staffDev = await prisma.staff.findFirst({
    where: { staffId: "DEV" },
    select: {
      id: true,
      staffId: true,
      branchId: true,
      role: true,
      name: true,
    },
  })
  console.log(
    JSON.stringify(
      {
        ho,
        periods,
        periodJournalCount: periodJournals,
        periodVoucherCount: periodVouchers,
        smokeOnlyVouchers,
        otherBranchVouchersOnThosePeriods,
        snaps,
        closeEv,
        reopenEv,
        reopenReq,
        staffDev,
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
