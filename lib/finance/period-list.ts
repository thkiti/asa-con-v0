import type { AccountingPeriodStatus, PrismaClient } from "@/generated/prisma/client"

export type AccountingPeriodListFilter = {
  branchId?: string
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

export type PeriodListPrisma = Pick<PrismaClient, "accountingPeriod">

export async function listAccountingPeriods(
  prisma: PeriodListPrisma,
  filter?: AccountingPeriodListFilter
): Promise<AccountingPeriodListRow[]> {
  const branchId = filter?.branchId?.trim()

  const rows = await prisma.accountingPeriod.findMany({
    where: branchId ? { branchId } : undefined,
    include: {
      branch: {
        select: { name: true },
      },
    },
    orderBy: [{ periodKey: "desc" }, { branchId: "asc" }],
  })

  return rows.map((row) => ({
    id: row.id,
    periodKey: row.periodKey,
    branchId: row.branchId,
    branchName: row.branch.name,
    status: row.status,
    openedAt: row.openedAt,
    closedAt: row.closedAt,
  }))
}
