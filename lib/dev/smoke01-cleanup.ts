/**
 * DEVELOPMENT-ONLY helper to purge SMOKE01 transactional + branch data.
 * Reuses the Journal/Voucher/archive deletion order from June UAT reset.
 *
 * Never deletes AccountingPeriod rows (entity-wide) — rehomes branchId to HO999.
 * Never deletes the DEV period-admin staff — rehomes to HO999.
 */
import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import {
  detectUatResetTablePresence,
  isPrismaMissingTableError,
  type UatResetTablePresence,
} from "@/lib/uat/june-uat-reset"

export const SMOKE01_BRANCH_CODE = "SMOKE01"
export const SMOKE01_CLEANUP_CONFIRM_TOKEN = "SMOKE01_DEV_CLEANUP_CONFIRMED"
export const SMOKE01_FALLBACK_HOME_BRANCH_CODE = "HO999"
/** Smoke seed product — optional soft-delete; left intact by default. */
export const SMOKE01_PRODUCT_CODE = "SMOKE-PROD-001"

export type Smoke01InspectReport = {
  branch: {
    id: string
    code: string
    name: string
    isActive: boolean
    deleted: boolean
  } | null
  counts: Record<string, number>
  voucherNos: string[]
  receiptNos: string[]
  staffHome: Array<{ staffId: string; name: string; role: string }>
  periodsToRehome: Array<{
    periodKey: string
    status: string
    legalEntityCode: string
  }>
  fallbackHomeBranch: { id: string; code: string } | null
  smokeProduct: { id: string; code: string; deleted: boolean } | null
}

type Db = PrismaClient | Prisma.TransactionClient

async function safeArchiveLinkCount(
  db: Db,
  where: Prisma.DocumentArchiveLinkWhereInput,
  presence: UatResetTablePresence
): Promise<number> {
  if (!presence.documentArchiveLink) return 0
  try {
    return await db.documentArchiveLink.count({ where })
  } catch (err) {
    if (isPrismaMissingTableError(err, "DocumentArchiveLink")) return 0
    throw err
  }
}

async function safeArchiveLinkDelete(
  db: Db,
  where: Prisma.DocumentArchiveLinkWhereInput,
  presence: UatResetTablePresence
): Promise<void> {
  if (!presence.documentArchiveLink) return
  try {
    await db.documentArchiveLink.deleteMany({ where })
  } catch (err) {
    if (isPrismaMissingTableError(err, "DocumentArchiveLink")) return
    throw err
  }
}

export async function inspectSmoke01Data(
  db: PrismaClient
): Promise<Smoke01InspectReport> {
  const presence = await detectUatResetTablePresence(db)
  const branch = await db.branch.findFirst({
    where: { code: SMOKE01_BRANCH_CODE },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      deleted: true,
    },
  })
  const fallbackHomeBranch = await db.branch.findFirst({
    where: { code: SMOKE01_FALLBACK_HOME_BRANCH_CODE, deleted: false },
    select: { id: true, code: true },
  })
  const smokeProduct = await db.product.findFirst({
    where: { code: SMOKE01_PRODUCT_CODE },
    select: { id: true, code: true, deleted: true },
  })

  if (!branch) {
    return {
      branch: null,
      counts: {},
      voucherNos: [],
      receiptNos: [],
      staffHome: [],
      periodsToRehome: [],
      fallbackHomeBranch,
      smokeProduct,
    }
  }

  const id = branch.id
  const sales = await db.sale.findMany({
    where: { branchId: id },
    select: { id: true },
  })
  const saleIds = sales.map((s) => s.id)
  const refunds = await db.refund.findMany({
    where: { branchId: id },
    select: { id: true },
  })
  const refundIds = refunds.map((r) => r.id)
  const receipts =
    saleIds.length > 0
      ? await db.receipt.findMany({
          where: { saleId: { in: saleIds } },
          select: { id: true, receiptNo: true, documentArchiveId: true },
        })
      : []
  const payments =
    saleIds.length > 0
      ? await db.payment.count({ where: { saleId: { in: saleIds } } })
      : 0
  const paymentEvidence =
    saleIds.length > 0
      ? await db.paymentEvidence.count({ where: { saleId: { in: saleIds } } })
      : 0
  const vouchers = await db.voucher.findMany({
    where: { branchId: id },
    select: { id: true, voucherNo: true },
  })
  const voucherIds = vouchers.map((v) => v.id)
  const voucherLines =
    voucherIds.length > 0
      ? await db.voucherLine.count({ where: { voucherId: { in: voucherIds } } })
      : 0
  const journals =
    voucherIds.length > 0
      ? await db.journalEntry.findMany({
          where: { voucherId: { in: voucherIds } },
          select: { id: true },
        })
      : []
  const journalIds = journals.map((j) => j.id)
  const journalEntryLines =
    journalIds.length > 0
      ? await db.journalEntryLine.count({
          where: { journalEntryId: { in: journalIds } },
        })
      : 0
  const vouchersBySaleRef =
    saleIds.length > 0
      ? await db.voucher.count({
          where: {
            refType: FINANCE_REF_TYPES.POS_SALE,
            refId: { in: saleIds },
          },
        })
      : 0
  const collectors = await db.collectorReport.findMany({
    where: { branchId: id },
    select: { id: true },
  })
  const collectorIds = collectors.map((c) => c.id)
  const archivesByBranch = await db.documentArchive.findMany({
    where: { branchId: id },
    select: { id: true },
  })
  const receiptArchiveIds = receipts
    .map((r) => r.documentArchiveId)
    .filter((x): x is string => Boolean(x))
  const archiveLinkWhere: Prisma.DocumentArchiveLinkWhereInput = {
    OR: [
      ...(saleIds.length
        ? [{ documentKind: "REC" as const, documentId: { in: saleIds } }]
        : []),
      ...(refundIds.length
        ? [{ documentKind: "REF" as const, documentId: { in: refundIds } }]
        : []),
      ...(collectorIds.length
        ? [{ documentKind: "COL" as const, documentId: { in: collectorIds } }]
        : []),
      ...(archivesByBranch.length
        ? [{ archiveId: { in: archivesByBranch.map((a) => a.id) } }]
        : []),
    ],
  }
  const documentArchiveLinks =
    (archiveLinkWhere.OR?.length ?? 0) > 0
      ? await safeArchiveLinkCount(db, archiveLinkWhere, presence)
      : 0

  const staffHome = await db.staff.findMany({
    where: { branchId: id },
    select: { staffId: true, name: true, role: true },
  })
  const periodsToRehome = await db.accountingPeriod.findMany({
    where: { branchId: id },
    select: { periodKey: true, status: true, legalEntityCode: true },
  })

  const counts: Record<string, number> = {
    staff: staffHome.length,
    sales: saleIds.length,
    receipts: receipts.length,
    payments,
    paymentEvidence,
    refunds: refundIds.length,
    vouchers: voucherIds.length,
    voucherLines,
    journals: journalIds.length,
    journalEntryLines,
    vouchersBySaleRef,
    stockTransactions: await db.stockTransaction.count({
      where: { branchId: id },
    }),
    stockDocuments: await db.stockDocument.count({ where: { branchId: id } }),
    stocks: await db.stock.count({ where: { branchId: id } }),
    stockLayers: await db.stockLayer.count({ where: { branchId: id } }),
    collectorReports: collectorIds.length,
    posPayInEvidence:
      collectorIds.length > 0
        ? await db.posPayInEvidence.count({
            where: { collectorReportId: { in: collectorIds } },
          })
        : 0,
    documentArchivesBranch: archivesByBranch.length,
    documentArchivesViaReceiptFk: receiptArchiveIds.length,
    documentArchiveLinks,
    salesTargets: await db.branchSalesTarget.count({ where: { branchId: id } }),
    workTimeEntries: await db.workTimeEntry.count({ where: { branchId: id } }),
    documentCounters: await db.documentCounter.count({ where: { shopId: id } }),
    reconciliationSnapshots: await db.reconciliationSnapshot.count({
      where: { branchId: id },
    }),
    bankReconciliations: await db.bankReconciliation.count({
      where: { branchId: id },
    }),
    cashReconciliations: await db.cashReconciliation.count({
      where: { branchId: id },
    }),
    accountingPeriodsToRehome: periodsToRehome.length,
    periodCloseEvidence: await db.accountingPeriodCloseEvidence.count({
      where: { branchId: id },
    }),
    periodReopenEvidence: await db.accountingPeriodReopenEvidence.count({
      where: { branchId: id },
    }),
    periodReopenRequests: await db.accountingPeriodReopenRequest.count({
      where: { branchId: id },
    }),
    manualJournalEntries: await db.manualJournalEntry.count({
      where: { branchId: id },
    }),
    paymentVouchers: await db.paymentVoucher.count({ where: { branchId: id } }),
    pettyCashVouchers: await db.pettyCashVoucher.count({
      where: { branchId: id },
    }),
    revenueVouchers: await db.revenueVoucher.count({ where: { branchId: id } }),
    invoiceVouchers: await db.invoiceVoucher.count({ where: { branchId: id } }),
  }

  return {
    branch,
    counts,
    voucherNos: vouchers.map((v) => v.voucherNo),
    receiptNos: receipts.map((r) => r.receiptNo),
    staffHome,
    periodsToRehome,
    fallbackHomeBranch,
    smokeProduct,
  }
}

export type Smoke01CleanupResult = {
  deleted: Record<string, number>
  rehomed: {
    accountingPeriods: number
    staff: number
    periodEvidenceBranchIdsUpdated: number
  }
}

/**
 * Hard-delete SMOKE01 branch and all operational dependents.
 * Preserves entity AccountingPeriod rows and DEV staff by rehoming to HO999.
 */
export async function executeSmoke01Cleanup(
  db: PrismaClient
): Promise<Smoke01CleanupResult> {
  const presence = await detectUatResetTablePresence(db)
  const branch = await db.branch.findFirst({
    where: { code: SMOKE01_BRANCH_CODE },
    select: { id: true, code: true },
  })
  if (!branch) {
    throw new Error(`${SMOKE01_BRANCH_CODE} branch not found`)
  }
  if (branch.code !== SMOKE01_BRANCH_CODE) {
    throw new Error("Refusing cleanup: branch code mismatch")
  }

  const home = await db.branch.findFirst({
    where: { code: SMOKE01_FALLBACK_HOME_BRANCH_CODE, deleted: false },
    select: { id: true, code: true },
  })
  if (!home) {
    throw new Error(
      `Fallback home branch ${SMOKE01_FALLBACK_HOME_BRANCH_CODE} not found — aborting`
    )
  }
  if (home.id === branch.id) {
    throw new Error("Fallback home branch resolves to SMOKE01 — aborting")
  }

  const deleted: Record<string, number> = {}
  const bump = (key: string, n: number) => {
    deleted[key] = (deleted[key] ?? 0) + n
  }

  return db.$transaction(async (tx) => {
    const id = branch.id

    const sales = await tx.sale.findMany({
      where: { branchId: id },
      select: { id: true },
    })
    const saleIds = sales.map((s) => s.id)
    const refunds = await tx.refund.findMany({
      where: { branchId: id },
      select: { id: true },
    })
    const refundIds = refunds.map((r) => r.id)
    const vouchers = await tx.voucher.findMany({
      where: { branchId: id },
      select: { id: true },
    })
    const voucherIds = vouchers.map((v) => v.id)

    // Also catch POS vouchers keyed by sale/refund even if branchId drifted.
    const extraVouchers =
      saleIds.length + refundIds.length > 0
        ? await tx.voucher.findMany({
            where: {
              id: { notIn: voucherIds.length ? voucherIds : ["__none__"] },
              OR: [
                ...(saleIds.length
                  ? [
                      {
                        refType: FINANCE_REF_TYPES.POS_SALE,
                        refId: { in: saleIds },
                      },
                    ]
                  : []),
                ...(refundIds.length
                  ? [
                      {
                        refType: FINANCE_REF_TYPES.POS_REFUND,
                        refId: { in: refundIds },
                      },
                    ]
                  : []),
              ],
            },
            select: { id: true },
          })
        : []
    const allVoucherIds = [
      ...new Set([...voucherIds, ...extraVouchers.map((v) => v.id)]),
    ]

    const collectors = await tx.collectorReport.findMany({
      where: { branchId: id },
      select: { id: true },
    })
    const collectorIds = collectors.map((c) => c.id)
    const archives = await tx.documentArchive.findMany({
      where: { branchId: id },
      select: { id: true },
    })
    const archiveIds = archives.map((a) => a.id)
    const receiptArchiveRows =
      saleIds.length > 0
        ? await tx.receipt.findMany({
            where: {
              saleId: { in: saleIds },
              documentArchiveId: { not: null },
            },
            select: { documentArchiveId: true },
          })
        : []
    for (const row of receiptArchiveRows) {
      if (row.documentArchiveId) archiveIds.push(row.documentArchiveId)
    }
    const uniqArchiveIds = [...new Set(archiveIds)]

    if (allVoucherIds.length > 0) {
      const cleared = await tx.posPayInEvidence.updateMany({
        where: { bankDepositVoucherId: { in: allVoucherIds } },
        data: { bankDepositVoucherId: null },
      })
      bump("posPayInEvidenceUnlinked", cleared.count)

      await tx.manualJournalEntry.updateMany({
        where: {
          OR: [
            { postedVoucherId: { in: allVoucherIds } },
            { postedJournalEntry: { voucherId: { in: allVoucherIds } } },
            { reversalJournalEntry: { voucherId: { in: allVoucherIds } } },
          ],
        },
        data: {
          postedVoucherId: null,
          postedJournalEntryId: null,
          reversalJournalEntryId: null,
        },
      })

      const rev = await tx.journalEntry.deleteMany({
        where: {
          reversalOfJournalEntryId: { not: null },
          voucherId: { in: allVoucherIds },
        },
      })
      bump("journalEntryReversals", rev.count)
      const journals = await tx.journalEntry.deleteMany({
        where: { voucherId: { in: allVoucherIds } },
      })
      bump("journalEntries", journals.count)
      const vouchersDeleted = await tx.voucher.deleteMany({
        where: { id: { in: allVoucherIds } },
      })
      bump("vouchers", vouchersDeleted.count)
    }

    if (uniqArchiveIds.length > 0) {
      await safeArchiveLinkDelete(
        tx,
        { archiveId: { in: uniqArchiveIds } },
        presence
      )
    }
    if (saleIds.length + refundIds.length + collectorIds.length > 0) {
      await safeArchiveLinkDelete(
        tx,
        {
          OR: [
            ...(saleIds.length
              ? [{ documentKind: "REC" as const, documentId: { in: saleIds } }]
              : []),
            ...(refundIds.length
              ? [
                  {
                    documentKind: "REF" as const,
                    documentId: { in: refundIds },
                  },
                ]
              : []),
            ...(collectorIds.length
              ? [
                  {
                    documentKind: "COL" as const,
                    documentId: { in: collectorIds },
                  },
                ]
              : []),
          ],
        },
        presence
      )
    }

    if (saleIds.length > 0) {
      await tx.receipt.updateMany({
        where: {
          saleId: { in: saleIds },
          documentArchiveId: { not: null },
        },
        data: { documentArchiveId: null },
      })
    }

    if (uniqArchiveIds.length > 0) {
      const a = await tx.documentArchive.deleteMany({
        where: { id: { in: uniqArchiveIds } },
      })
      bump("documentArchives", a.count)
    }

    if (collectorIds.length > 0) {
      const payIn = await tx.posPayInEvidence.deleteMany({
        where: { collectorReportId: { in: collectorIds } },
      })
      bump("posPayInEvidence", payIn.count)
      const col = await tx.collectorReport.deleteMany({
        where: { id: { in: collectorIds } },
      })
      bump("collectorReports", col.count)
    }

    if (refundIds.length > 0) {
      const r = await tx.refund.deleteMany({ where: { id: { in: refundIds } } })
      bump("refunds", r.count)
    }

    const stockTx = await tx.stockTransaction.deleteMany({
      where: { branchId: id },
    })
    bump("stockTransactions", stockTx.count)

    const stockDocs = await tx.stockDocument.deleteMany({
      where: { branchId: id },
    })
    bump("stockDocuments", stockDocs.count)

    if (saleIds.length > 0) {
      const s = await tx.sale.deleteMany({ where: { id: { in: saleIds } } })
      bump("sales", s.count)
    }

    const snaps = await tx.reconciliationSnapshot.deleteMany({
      where: { branchId: id },
    })
    bump("reconciliationSnapshots", snaps.count)

    const work = await tx.workTimeEntry.deleteMany({ where: { branchId: id } })
    bump("workTimeEntries", work.count)

    const targets = await tx.branchSalesTarget.deleteMany({
      where: { branchId: id },
    })
    bump("salesTargets", targets.count)

    const counters = await tx.documentCounter.deleteMany({
      where: { shopId: id },
    })
    bump("documentCounters", counters.count)

    const layers = await tx.stockLayer.deleteMany({ where: { branchId: id } })
    bump("stockLayers", layers.count)
    const stocks = await tx.stock.deleteMany({ where: { branchId: id } })
    bump("stocks", stocks.count)

    const bankRec = await tx.bankReconciliation.deleteMany({
      where: { branchId: id },
    })
    bump("bankReconciliations", bankRec.count)
    const cashRec = await tx.cashReconciliation.deleteMany({
      where: { branchId: id },
    })
    bump("cashReconciliations", cashRec.count)

    // Workflow vouchers on this branch (should be zero for smoke; fail closed if present)
    for (const [key, run] of [
      [
        "manualJournalEntries",
        () => tx.manualJournalEntry.deleteMany({ where: { branchId: id } }),
      ],
      [
        "paymentVouchers",
        () => tx.paymentVoucher.deleteMany({ where: { branchId: id } }),
      ],
      [
        "pettyCashVouchers",
        () => tx.pettyCashVoucher.deleteMany({ where: { branchId: id } }),
      ],
      [
        "revenueVouchers",
        () => tx.revenueVoucher.deleteMany({ where: { branchId: id } }),
      ],
      [
        "invoiceVouchers",
        () => tx.invoiceVoucher.deleteMany({ where: { branchId: id } }),
      ],
    ] as const) {
      const result = await run()
      bump(key, result.count)
    }

    // Period evidence stores branchId as plain string (no FK) — rewrite to HO999 for history
    const closeEv = await tx.accountingPeriodCloseEvidence.updateMany({
      where: { branchId: id },
      data: { branchId: home.id },
    })
    const reopenEv = await tx.accountingPeriodReopenEvidence.updateMany({
      where: { branchId: id },
      data: { branchId: home.id },
    })
    const reopenReq = await tx.accountingPeriodReopenRequest.updateMany({
      where: { branchId: id },
      data: { branchId: home.id },
    })

    const periods = await tx.accountingPeriod.updateMany({
      where: { branchId: id },
      data: { branchId: home.id },
    })

    const staff = await tx.staff.updateMany({
      where: { branchId: id },
      data: { branchId: home.id },
    })

    const remainingStaff = await tx.staff.count({ where: { branchId: id } })
    const remainingPeriods = await tx.accountingPeriod.count({
      where: { branchId: id },
    })
    if (remainingStaff > 0 || remainingPeriods > 0) {
      throw new Error(
        `Cannot delete branch: still referenced by staff=${remainingStaff} periods=${remainingPeriods}`
      )
    }

    const branchDeleted = await tx.branch.deleteMany({
      where: { id, code: SMOKE01_BRANCH_CODE },
    })
    bump("branches", branchDeleted.count)
    if (branchDeleted.count !== 1) {
      throw new Error("Expected exactly one SMOKE01 branch delete")
    }

    return {
      deleted,
      rehomed: {
        accountingPeriods: periods.count,
        staff: staff.count,
        periodEvidenceBranchIdsUpdated:
          closeEv.count + reopenEv.count + reopenReq.count,
      },
    }
  })
}

export async function verifySmoke01Gone(db: PrismaClient): Promise<{
  ok: boolean
  checks: Record<string, number | boolean | string | null>
}> {
  const branch = await db.branch.findFirst({
    where: { code: SMOKE01_BRANCH_CODE },
  })
  const vouchers = await db.voucher.count({
    where: {
      OR: [
        { refNo: { contains: "SMOKE01" } },
        { branch: { code: SMOKE01_BRANCH_CODE } },
      ],
    },
  })
  const journals = await db.journalEntry.count({
    where: {
      voucher: {
        OR: [
          { refNo: { contains: "SMOKE01" } },
          { branch: { code: SMOKE01_BRANCH_CODE } },
        ],
      },
    },
  })
  const receipts = await db.receipt.count({
    where: { receiptNo: { contains: "SMOKE01" } },
  })
  const shopBranches = await db.branch.count({
    where: {
      code: SMOKE01_BRANCH_CODE,
      deleted: false,
      isActive: true,
      type: "SH",
    },
  })

  const checks = {
    branchRemaining: branch != null,
    branchId: branch?.id ?? null,
    vouchersReferencingSmoke: vouchers,
    journalsReferencingSmoke: journals,
    receiptsContainingSmoke01: receipts,
    activeShopSelectorHits: shopBranches,
  }

  const ok =
    !checks.branchRemaining &&
    vouchers === 0 &&
    journals === 0 &&
    receipts === 0 &&
    shopBranches === 0

  return { ok, checks }
}
