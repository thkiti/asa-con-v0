import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { prisma } from "../lib/shared/prisma"

async function main() {
  const periodKey = process.argv[2] ?? "2026-06"
  const legalEntityCode = process.argv[3] ?? "AS"

  const period = await prisma.accountingPeriod.findFirst({
    where: { legalEntityCode, periodKey },
    include: { branch: { select: { code: true, name: true } } },
  })

  console.log("=== AccountingPeriod ===")
  console.log(JSON.stringify(period, null, 2))

  if (!period) {
    await prisma.$disconnect()
    return
  }

  const closeEvidence = await prisma.accountingPeriodCloseEvidence.findMany({
    where: { periodId: period.id },
    orderBy: { closedAt: "desc" },
    take: 5,
    select: {
      id: true,
      closedAt: true,
      closedByStaffId: true,
      closedByName: true,
      closedByRole: true,
      closeMode: true,
      readinessStatus: true,
    },
  })

  console.log("\n=== Close evidence (latest) ===")
  console.log(JSON.stringify(closeEvidence, null, 2))

  const reopenEvidence = await prisma.accountingPeriodReopenEvidence.findMany({
    where: { periodId: period.id },
    orderBy: { reopenedAt: "desc" },
    take: 5,
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      reason: true,
      reopenedAt: true,
      reopenedByStaffId: true,
      reopenedByName: true,
    },
  })

  console.log("\n=== Reopen evidence ===")
  console.log(JSON.stringify(reopenEvidence, null, 2))

  const reopenRequests = await prisma.accountingPeriodReopenRequest.findMany({
    where: { periodId: period.id },
    orderBy: { requestedAt: "desc" },
    take: 5,
  })

  console.log("\n=== Reopen requests ===")
  console.log(JSON.stringify(reopenRequests, null, 2))

  const closingEntries = await prisma.voucher.findMany({
    where: {
      legalEntityCode: period.legalEntityCode,
      refType: "PERIOD_CLOSING",
      refId: period.id,
    },
    select: {
      id: true,
      voucherNo: true,
      status: true,
      postedAt: true,
      journalEntry: {
        select: {
          id: true,
          reversedBy: { select: { id: true } },
        },
      },
    },
  })

  console.log("\n=== Period closing vouchers ===")
  console.log(JSON.stringify(closingEntries, null, 2))

  const allPeriodsAs = await prisma.accountingPeriod.findMany({
    where: { legalEntityCode, periodKey },
    select: {
      id: true,
      status: true,
      branchId: true,
      closedAt: true,
      branch: { select: { code: true, name: true } },
    },
  })

  console.log("\n=== All AS periods with key 2026-06 (by branch) ===")
  console.log(JSON.stringify(allPeriodsAs, null, 2))

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
