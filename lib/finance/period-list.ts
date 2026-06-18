import type { AccountingPeriodStatus, PrismaClient } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { resolvePeriodLegalEntityCode } from "./period-lookup"

export type AccountingPeriodListFilter = {
  legalEntityCode?: DocumentEntityCode | null
  periodKey?: string
  status?: AccountingPeriodStatus
}

export type AccountingPeriodListRow = {
  id: string
  periodKey: string
  legalEntityCode: DocumentEntityCode
  branchId: string
  branchName: string
  status: AccountingPeriodStatus
  openedAt: Date
  closedAt: Date | null
}

export type AccountingPeriodWithBranch = {
  id: string
  periodKey: string
  legalEntityCode: string
  branchId: string
  status: AccountingPeriodStatus
  openedAt: Date
  closedAt: Date | null
  branch: { name: string }
}

export type PeriodListPrisma = Pick<PrismaClient, "accountingPeriod">

export function toAccountingPeriodListRow(
  row: AccountingPeriodWithBranch
): AccountingPeriodListRow {
  return {
    id: row.id,
    periodKey: row.periodKey,
    legalEntityCode: row.legalEntityCode as DocumentEntityCode,
    branchId: row.branchId,
    branchName: row.branch.name,
    status: row.status,
    openedAt: row.openedAt,
    closedAt: row.closedAt,
  }
}

export async function listAccountingPeriods(
  prisma: PeriodListPrisma,
  filter?: AccountingPeriodListFilter
): Promise<AccountingPeriodListRow[]> {
  const legalEntityCode = filter?.legalEntityCode
    ? resolvePeriodLegalEntityCode(filter.legalEntityCode)
    : undefined
  const periodKey = filter?.periodKey?.trim()
  const status = filter?.status

  const rows = await prisma.accountingPeriod.findMany({
    where: {
      ...(legalEntityCode ? { legalEntityCode } : {}),
      ...(periodKey ? { periodKey } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      branch: {
        select: { name: true },
      },
    },
    orderBy: [{ periodKey: "desc" }, { legalEntityCode: "asc" }],
  })

  return rows.map(toAccountingPeriodListRow)
}
