/**
 * MC-1D Step 2 — Legal entity backfill + AccountingPeriod dedupe.
 * Single transaction; rolls back if assertions fail.
 */
import "dotenv/config"
import { randomUUID } from "crypto"

import { AccountingPeriodStatus, type Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"

const DUPLICATE_PERIOD_ID = "d070fe68-a228-4c8b-bff9-a25e98f31dcf"
const CANONICAL_PERIOD_ID = "fdf39c4f-29c1-447e-bca3-39b2bff0e47c"
const HO_BRANCH_CODE = "HO999"
const AD_PERIOD_KEYS = ["2026-05", "2026-06"] as const

type ChangeLog = {
  updateLegalEntityAs: Record<string, number>
  repointPeriodId: Record<string, number>
  deleteAccountingPeriod: number
  insertAdAccountingPeriod: number
}

async function assertPostBackfill(tx: Prisma.TransactionClient): Promise<void> {
  const nullChecks = await tx.$queryRaw<
    { tbl: string; null_count: bigint }[]
  >`
    SELECT 'AccountingPeriod' AS tbl, COUNT(*) AS null_count
    FROM "AccountingPeriod" WHERE "legalEntityCode" IS NULL
    UNION ALL
    SELECT 'Voucher', COUNT(*) FROM "Voucher" WHERE "legalEntityCode" IS NULL
    UNION ALL
    SELECT 'JournalEntry', COUNT(*) FROM "JournalEntry" WHERE "legalEntityCode" IS NULL
    UNION ALL
    SELECT 'StockDocument', COUNT(*) FROM "StockDocument" WHERE "legalEntityCode" IS NULL
  `

  for (const row of nullChecks) {
    if (Number(row.null_count) !== 0) {
      throw new Error(`Assertion failed: ${row.tbl} has null legalEntityCode`)
    }
  }

  const dupEntityPeriod = await tx.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*) AS cnt FROM (
      SELECT "legalEntityCode", "periodKey"
      FROM "AccountingPeriod"
      GROUP BY "legalEntityCode", "periodKey"
      HAVING COUNT(*) > 1
    ) t
  `
  if (Number(dupEntityPeriod[0]?.cnt ?? 0) !== 0) {
    throw new Error("Assertion failed: duplicate (legalEntityCode, periodKey)")
  }

  const orphans = await tx.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*) AS cnt FROM (
      SELECT v.id FROM "Voucher" v
      LEFT JOIN "AccountingPeriod" ap ON ap.id = v."periodId"
      WHERE ap.id IS NULL
      UNION ALL
      SELECT je.id FROM "JournalEntry" je
      LEFT JOIN "AccountingPeriod" ap ON ap.id = je."periodId"
      WHERE ap.id IS NULL
      UNION ALL
      SELECT ce.id FROM "AccountingPeriodCloseEvidence" ce
      LEFT JOIN "AccountingPeriod" ap ON ap.id = ce."periodId"
      WHERE ap.id IS NULL
      UNION ALL
      SELECT re.id FROM "AccountingPeriodReopenEvidence" re
      LEFT JOIN "AccountingPeriod" ap ON ap.id = re."periodId"
      WHERE ap.id IS NULL
    ) o
  `
  if (Number(orphans[0]?.cnt ?? 0) !== 0) {
    throw new Error("Assertion failed: orphan periodId references")
  }

  const journalVoucherMismatch = await tx.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*) AS cnt
    FROM "JournalEntry" je
    JOIN "Voucher" v ON v.id = je."voucherId"
    WHERE je."legalEntityCode" IS DISTINCT FROM v."legalEntityCode"
  `
  if (Number(journalVoucherMismatch[0]?.cnt ?? 0) !== 0) {
    throw new Error("Assertion failed: JournalEntry legalEntityCode != Voucher")
  }

  const docPeriodMismatch = await tx.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*) AS cnt FROM (
      SELECT v.id FROM "Voucher" v
      JOIN "AccountingPeriod" ap ON ap.id = v."periodId"
      WHERE v."legalEntityCode" IS DISTINCT FROM ap."legalEntityCode"
      UNION ALL
      SELECT je.id FROM "JournalEntry" je
      JOIN "AccountingPeriod" ap ON ap.id = je."periodId"
      WHERE je."legalEntityCode" IS DISTINCT FROM ap."legalEntityCode"
    ) m
  `
  if (Number(docPeriodMismatch[0]?.cnt ?? 0) !== 0) {
    throw new Error(
      "Assertion failed: Voucher/JournalEntry legalEntityCode != AccountingPeriod"
    )
  }

  const duplicateStillExists = await tx.accountingPeriod.count({
    where: { id: DUPLICATE_PERIOD_ID },
  })
  if (duplicateStillExists !== 0) {
    throw new Error("Assertion failed: duplicate AccountingPeriod still exists")
  }

  const adCount = await tx.accountingPeriod.count({
    where: { legalEntityCode: "AD" },
  })
  if (adCount !== AD_PERIOD_KEYS.length) {
    throw new Error(`Assertion failed: expected ${AD_PERIOD_KEYS.length} AD periods, got ${adCount}`)
  }
}

async function main() {
  const hoBranch = await prisma.branch.findUnique({
    where: { code: HO_BRANCH_CODE },
    select: { id: true, code: true },
  })
  if (!hoBranch) {
    throw new Error(`Branch ${HO_BRANCH_CODE} not found — cannot bootstrap AD periods`)
  }

  const changeLog = await prisma.$transaction(async (tx) => {
    const log: ChangeLog = {
      updateLegalEntityAs: {},
      repointPeriodId: {},
      deleteAccountingPeriod: 0,
      insertAdAccountingPeriod: 0,
    }

    log.updateLegalEntityAs.AccountingPeriod = (
      await tx.accountingPeriod.updateMany({
        where: { legalEntityCode: null },
        data: { legalEntityCode: "AS" },
      })
    ).count

    log.updateLegalEntityAs.Voucher = (
      await tx.voucher.updateMany({
        where: { legalEntityCode: null },
        data: { legalEntityCode: "AS" },
      })
    ).count

    log.updateLegalEntityAs.JournalEntry = (
      await tx.journalEntry.updateMany({
        where: { legalEntityCode: null },
        data: { legalEntityCode: "AS" },
      })
    ).count

    log.updateLegalEntityAs.StockDocument = (
      await tx.stockDocument.updateMany({
        where: { legalEntityCode: null },
        data: { legalEntityCode: "AS" },
      })
    ).count

    log.repointPeriodId.Voucher = (
      await tx.voucher.updateMany({
        where: { periodId: DUPLICATE_PERIOD_ID },
        data: { periodId: CANONICAL_PERIOD_ID },
      })
    ).count

    log.repointPeriodId.JournalEntry = (
      await tx.journalEntry.updateMany({
        where: { periodId: DUPLICATE_PERIOD_ID },
        data: { periodId: CANONICAL_PERIOD_ID },
      })
    ).count

    log.repointPeriodId.AccountingPeriodReopenEvidence = (
      await tx.accountingPeriodReopenEvidence.updateMany({
        where: { periodId: DUPLICATE_PERIOD_ID },
        data: { periodId: CANONICAL_PERIOD_ID },
      })
    ).count

    log.repointPeriodId.AccountingPeriodCloseEvidence = (
      await tx.accountingPeriodCloseEvidence.updateMany({
        where: { periodId: DUPLICATE_PERIOD_ID },
        data: { periodId: CANONICAL_PERIOD_ID },
      })
    ).count

    log.repointPeriodId.AccountingPeriodReopenRequest = (
      await tx.accountingPeriodReopenRequest.updateMany({
        where: { periodId: DUPLICATE_PERIOD_ID },
        data: { periodId: CANONICAL_PERIOD_ID },
      })
    ).count

    log.deleteAccountingPeriod = (
      await tx.accountingPeriod.deleteMany({
        where: { id: DUPLICATE_PERIOD_ID },
      })
    ).count

    for (const periodKey of AD_PERIOD_KEYS) {
      const existing = await tx.accountingPeriod.findFirst({
        where: { periodKey, legalEntityCode: "AD" },
        select: { id: true },
      })
      if (existing) continue

      await tx.accountingPeriod.create({
        data: {
          id: randomUUID(),
          periodKey,
          branchId: hoBranch.id,
          legalEntityCode: "AD",
          status: AccountingPeriodStatus.OPEN,
        },
      })
      log.insertAdAccountingPeriod += 1
    }

    await assertPostBackfill(tx)

    return log
  })

  const finalPeriods = await prisma.accountingPeriod.findMany({
    include: { branch: { select: { code: true } } },
    orderBy: [{ legalEntityCode: "asc" }, { periodKey: "asc" }],
  })

  const nullCheck = await prisma.$queryRaw<
    { tbl: string; null_count: bigint }[]
  >`
    SELECT 'AccountingPeriod' AS tbl, COUNT(*) AS null_count
    FROM "AccountingPeriod" WHERE "legalEntityCode" IS NULL
    UNION ALL
    SELECT 'Voucher', COUNT(*) FROM "Voucher" WHERE "legalEntityCode" IS NULL
    UNION ALL
    SELECT 'JournalEntry', COUNT(*) FROM "JournalEntry" WHERE "legalEntityCode" IS NULL
    UNION ALL
    SELECT 'StockDocument', COUNT(*) FROM "StockDocument" WHERE "legalEntityCode" IS NULL
  `

  const dupCheck = await prisma.$queryRaw<
    { legalEntityCode: string; periodKey: string; cnt: bigint }[]
  >`
    SELECT "legalEntityCode", "periodKey", COUNT(*) AS cnt
    FROM "AccountingPeriod"
    GROUP BY "legalEntityCode", "periodKey"
    HAVING COUNT(*) > 1
  `

  const orphanCheck = await prisma.$queryRaw<{ src: string; id: string }[]>`
    SELECT 'Voucher' AS src, v.id FROM "Voucher" v
    LEFT JOIN "AccountingPeriod" ap ON ap.id = v."periodId"
    WHERE ap.id IS NULL
    UNION ALL
    SELECT 'JournalEntry', je.id FROM "JournalEntry" je
    LEFT JOIN "AccountingPeriod" ap ON ap.id = je."periodId"
    WHERE ap.id IS NULL
    UNION ALL
    SELECT 'CloseEvidence', ce.id FROM "AccountingPeriodCloseEvidence" ce
    LEFT JOIN "AccountingPeriod" ap ON ap.id = ce."periodId"
    WHERE ap.id IS NULL
    UNION ALL
    SELECT 'ReopenEvidence', re.id FROM "AccountingPeriodReopenEvidence" re
    LEFT JOIN "AccountingPeriod" ap ON ap.id = re."periodId"
    WHERE ap.id IS NULL
  `

  const journalVoucherCheck = await prisma.$queryRaw<
    { journal_id: string; je_entity: string; voucher_entity: string }[]
  >`
    SELECT je.id AS journal_id, je."legalEntityCode" AS je_entity, v."legalEntityCode" AS voucher_entity
    FROM "JournalEntry" je
    JOIN "Voucher" v ON v.id = je."voucherId"
    WHERE je."legalEntityCode" IS DISTINCT FROM v."legalEntityCode"
  `

  const docPeriodCheck = await prisma.$queryRaw<
    { src: string; id: string; doc_entity: string; period_entity: string }[]
  >`
    SELECT 'Voucher' AS src, v.id, v."legalEntityCode" AS doc_entity, ap."legalEntityCode" AS period_entity
    FROM "Voucher" v
    JOIN "AccountingPeriod" ap ON ap.id = v."periodId"
    WHERE v."legalEntityCode" IS DISTINCT FROM ap."legalEntityCode"
    UNION ALL
    SELECT 'JournalEntry', je.id, je."legalEntityCode", ap."legalEntityCode"
    FROM "JournalEntry" je
    JOIN "AccountingPeriod" ap ON ap.id = je."periodId"
    WHERE je."legalEntityCode" IS DISTINCT FROM ap."legalEntityCode"
  `

  const [voucherTotal, journalTotal, closeEvidence, reopenEvidence] =
    await Promise.all([
      prisma.voucher.count(),
      prisma.journalEntry.count(),
      prisma.accountingPeriodCloseEvidence.count(),
      prisma.accountingPeriodReopenEvidence.count(),
    ])

  console.log(
    JSON.stringify(
      {
        status: "COMMITTED",
        changeLog,
        finalAccountingPeriodRows: finalPeriods.map((p) => ({
          id: p.id,
          periodKey: p.periodKey,
          legalEntityCode: p.legalEntityCode,
          branchCode: p.branch.code,
          status: p.status,
        })),
        nullLegalEntityCodeCheck: nullCheck.map((r) => ({
          table: r.tbl,
          nullCount: Number(r.null_count),
        })),
        duplicateLegalEntityPeriodKey: dupCheck.map((r) => ({
          legalEntityCode: r.legalEntityCode,
          periodKey: r.periodKey,
          count: Number(r.cnt),
        })),
        orphanFkCheck: orphanCheck,
        journalVoucherEntityMismatch: journalVoucherCheck,
        voucherJournalPeriodEntityMismatch: docPeriodCheck,
        finalCounts: {
          accountingPeriod: finalPeriods.length,
          asPeriods: finalPeriods.filter((p) => p.legalEntityCode === "AS").length,
          adPeriods: finalPeriods.filter((p) => p.legalEntityCode === "AD").length,
          voucher: voucherTotal,
          journalEntry: journalTotal,
          closeEvidence,
          reopenEvidence,
        },
      },
      null,
      2
    )
  )
}

main()
  .catch((err) => {
    console.error(JSON.stringify({ status: "FAILED", error: String(err) }, null, 2))
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
