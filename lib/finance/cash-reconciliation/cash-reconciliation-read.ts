import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { parseDocumentEntityCode } from "@/lib/legal-entity/document-entity"
import {
  CashReconciliationError,
  CashReconciliationErrorCodes,
} from "./cash-reconciliation-errors"
import type {
  CashReconciliationListFilter,
  CashReconciliationListResult,
  CashReconciliationRow,
} from "./cash-reconciliation-types"

export type CashReconciliationReadPrisma = Pick<
  PrismaClient,
  "cashReconciliation" | "glAccount"
>

type CashReconciliationDbRow = Prisma.CashReconciliationGetPayload<{
  include: { glAccount: { select: { id: true; code: true; name: true } } }
}>

function mapRow(row: CashReconciliationDbRow): CashReconciliationRow {
  const legalEntityCode = parseDocumentEntityCode(row.legalEntityCode)
  if (!legalEntityCode) {
    throw new CashReconciliationError(
      `Invalid legal entity on cash reconciliation ${row.id}`,
      CashReconciliationErrorCodes.VALIDATION
    )
  }

  return {
    id: row.id,
    legalEntityCode,
    periodKey: row.periodKey,
    branchId: row.branchId,
    glAccount: {
      id: row.glAccount.id,
      code: row.glAccount.code,
      name: row.glAccount.name,
    },
    expectedCash: row.expectedCash.toFixed(2),
    actualCountedCash: row.actualCountedCash.toFixed(2),
    variance: row.variance.toFixed(2),
    note: row.note,
    evidenceNote: row.evidenceNote,
    status: row.status,
    workflow: {
      submittedAt: row.submittedAt?.toISOString() ?? null,
      submittedByStaffId: row.submittedByStaffId,
      confirmedAt: row.confirmedAt?.toISOString() ?? null,
      confirmedByStaffId: row.confirmedByStaffId,
      lockedAt: row.lockedAt?.toISOString() ?? null,
      lockedByStaffId: row.lockedByStaffId,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByStaffId: row.createdByStaffId,
    updatedByStaffId: row.updatedByStaffId,
  }
}

const listInclude = {
  glAccount: { select: { id: true, code: true, name: true } },
} as const

export async function listCashReconciliations(
  prisma: CashReconciliationReadPrisma,
  filter: CashReconciliationListFilter
): Promise<CashReconciliationListResult> {
  const where: Prisma.CashReconciliationWhereInput = {
    legalEntityCode: filter.legalEntityCode,
    ...(filter.periodKey ? { periodKey: filter.periodKey.trim() } : {}),
    ...(filter.branchId ? { branchId: filter.branchId.trim() } : {}),
    ...(filter.glAccountId ? { glAccountId: filter.glAccountId.trim() } : {}),
    ...(filter.status ? { status: filter.status } : {}),
  }

  const limit = filter.limit ?? 50
  const offset = filter.offset ?? 0

  const [rows, total] = await Promise.all([
    prisma.cashReconciliation.findMany({
      where,
      include: listInclude,
      orderBy: [{ periodKey: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.cashReconciliation.count({ where }),
  ])

  return {
    items: rows.map(mapRow),
    total,
  }
}

export async function getCashReconciliationById(
  prisma: CashReconciliationReadPrisma,
  id: string,
  legalEntityCode: DocumentEntityCode
): Promise<CashReconciliationRow> {
  const trimmedId = id.trim()
  if (!trimmedId) {
    throw new CashReconciliationError(
      "Cash reconciliation id is required",
      CashReconciliationErrorCodes.VALIDATION
    )
  }

  const row = await prisma.cashReconciliation.findFirst({
    where: { id: trimmedId, legalEntityCode },
    include: listInclude,
  })

  if (!row) {
    throw new CashReconciliationError(
      "Cash reconciliation not found",
      CashReconciliationErrorCodes.NOT_FOUND,
      404
    )
  }

  return mapRow(row)
}
