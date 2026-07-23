import "server-only"

import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { EndError, EndErrorCodes } from "./end-errors"

type DbClient = Prisma.TransactionClient | PrismaClient

export async function isPeriodHardClosed(
  db: DbClient,
  legalEntityCode: string,
  periodMonth: string
): Promise<boolean> {
  const period = await db.accountingPeriod.findUnique({
    where: {
      legalEntityCode_periodKey: {
        legalEntityCode: String(legalEntityCode).trim().toUpperCase(),
        periodKey: String(periodMonth).trim(),
      },
    },
    select: { status: true },
  })
  return period?.status === "HARD_CLOSED"
}

export async function assertPeriodNotHardClosed(
  db: DbClient,
  legalEntityCode: string,
  periodMonth: string
): Promise<void> {
  if (await isPeriodHardClosed(db, legalEntityCode, periodMonth)) {
    throw new EndError(
      `Accounting period ${periodMonth} is HARD_CLOSED`,
      EndErrorCodes.PERIOD_HARD_CLOSED,
      409
    )
  }
}

export async function loadPriorLockedEnd(
  db: DbClient,
  input: {
    legalEntityCode: string
    branchId: string
    priorPeriodMonth: string
  }
): Promise<{
  id: string
  endStatus: string | null
  lines: { productId: string; endingQty: number | null }[]
} | null> {
  const prior = await db.stockDocument.findFirst({
    where: {
      docType: "END",
      legalEntityCode: input.legalEntityCode,
      branchId: input.branchId,
      periodMonth: input.priorPeriodMonth,
    },
    select: {
      id: true,
      endStatus: true,
      endLines: {
        select: { productId: true, endingQty: true },
      },
    },
  })
  if (!prior) return null
  return {
    id: prior.id,
    endStatus: prior.endStatus,
    lines: prior.endLines,
  }
}

export async function hasLaterEnd(
  db: DbClient,
  input: {
    legalEntityCode: string
    branchId: string
    periodMonth: string
    excludeDocumentId?: string
  }
): Promise<boolean> {
  const later = await db.stockDocument.findFirst({
    where: {
      docType: "END",
      legalEntityCode: input.legalEntityCode,
      branchId: input.branchId,
      periodMonth: { gt: input.periodMonth },
      ...(input.excludeDocumentId
        ? { id: { not: input.excludeDocumentId } }
        : {}),
    },
    select: { id: true },
  })
  return Boolean(later)
}
