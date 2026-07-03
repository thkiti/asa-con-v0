import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { parseDocumentEntityCode } from "@/lib/legal-entity/document-entity"
import type {
  BankReconciliationListFilter,
  BankReconciliationListResult,
  BankReconciliationRow,
} from "./bank-reconciliation-types"
import {
  BankReconciliationError,
  BankReconciliationErrorCodes,
} from "./bank-reconciliation-errors"

export type BankReconciliationReadPrisma = Pick<
  PrismaClient,
  "bankReconciliation" | "glAccount"
>

type BankReconciliationDbRow = Prisma.BankReconciliationGetPayload<{
  include: { glAccount: { select: { id: true; code: true; name: true } } }
}>

function mapRow(row: BankReconciliationDbRow): BankReconciliationRow {
  const legalEntityCode = parseDocumentEntityCode(row.legalEntityCode)
  if (!legalEntityCode) {
    throw new BankReconciliationError(
      `Invalid legal entity on bank reconciliation ${row.id}`,
      BankReconciliationErrorCodes.VALIDATION
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
    glBalance: row.glBalance.toFixed(2),
    bankStatementBalance: row.bankStatementBalance.toFixed(2),
    outstandingDeposits: row.outstandingDeposits.toFixed(2),
    outstandingPayments: row.outstandingPayments.toFixed(2),
    bankCharges: row.bankCharges.toFixed(2),
    interest: row.interest.toFixed(2),
    adjustments: row.adjustments.toFixed(2),
    reconciledBalance: row.reconciledBalance.toFixed(2),
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

export async function listBankReconciliations(
  prisma: BankReconciliationReadPrisma,
  filter: BankReconciliationListFilter
): Promise<BankReconciliationListResult> {
  const where: Prisma.BankReconciliationWhereInput = {
    legalEntityCode: filter.legalEntityCode,
    ...(filter.periodKey ? { periodKey: filter.periodKey.trim() } : {}),
    ...(filter.branchId ? { branchId: filter.branchId.trim() } : {}),
    ...(filter.glAccountId ? { glAccountId: filter.glAccountId.trim() } : {}),
    ...(filter.status ? { status: filter.status } : {}),
  }

  const limit = filter.limit ?? 50
  const offset = filter.offset ?? 0

  const [rows, total] = await Promise.all([
    prisma.bankReconciliation.findMany({
      where,
      include: listInclude,
      orderBy: [{ periodKey: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.bankReconciliation.count({ where }),
  ])

  return {
    items: rows.map(mapRow),
    total,
  }
}

export async function getBankReconciliationById(
  prisma: BankReconciliationReadPrisma,
  id: string,
  legalEntityCode: DocumentEntityCode
): Promise<BankReconciliationRow> {
  const trimmedId = id.trim()
  if (!trimmedId) {
    throw new BankReconciliationError(
      "Bank reconciliation id is required",
      BankReconciliationErrorCodes.VALIDATION
    )
  }

  const row = await prisma.bankReconciliation.findFirst({
    where: { id: trimmedId, legalEntityCode },
    include: listInclude,
  })

  if (!row) {
    throw new BankReconciliationError(
      "Bank reconciliation not found",
      BankReconciliationErrorCodes.NOT_FOUND,
      404
    )
  }

  return mapRow(row)
}
