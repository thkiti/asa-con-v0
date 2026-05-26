import type { AccountingPeriodStatus, PrismaClient } from "@/generated/prisma/client"

export type AccountingPeriodListFilter = {
  branchId?: string
  periodKey?: string
  status?: AccountingPeriodStatus
}

export type AccountingPeriodListRow = {
  id: string
  periodKey: string
  branchId: string
  branchName: string
  status: AccountingPeriodStatus
  openedAt: Date
  closedAt: Date | null
}

export type AccountingPeriodWithBranch = {
  id: string
  periodKey: string
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
  const branchId = filter?.branchId?.trim()
  const periodKey = filter?.periodKey?.trim()
  const status = filter?.status

  const rows = await prisma.accountingPeriod.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(periodKey ? { periodKey } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      branch: {
        select: { name: true },
      },
    },
    orderBy: [{ periodKey: "desc" }, { branchId: "asc" }],
  })

  return rows.map(toAccountingPeriodListRow)
}
