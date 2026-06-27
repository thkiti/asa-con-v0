import type { Prisma } from "@/generated/prisma/client"
import { bangkokMonthRange } from "@/lib/reporting/bangkok-calendar"
import { parseCollectorRunningSeq } from "@/lib/pos-ui/build-collector-lookup-no"
import { parseRefundRunningSeq } from "@/lib/pos-ui/build-refund-lookup-no"
import type { PosDocumentLookupDocType } from "@/lib/pos-ui/document-lookup-doc-types"

export type ListDocumentLookupRunningNumbersInput = {
  branchId: string
  docType: PosDocumentLookupDocType
  year: number
  month: number
}

type RunningNumbersDb = Pick<Prisma.TransactionClient, "refund" | "collectorReport">

async function listRefundRunningNumbers(
  db: RunningNumbersDb,
  input: { branchId: string; year: number; month: number }
): Promise<string[]> {
  const branchId = input.branchId.trim()
  if (!branchId) return []

  const y = Number(input.year)
  const m = Number(input.month)
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return []
  }

  const { start, end } = bangkokMonthRange(y, m)
  const refunds = await db.refund.findMany({
    where: {
      branchId,
      createdAt: { gte: start, lte: end },
    },
    select: { refundNo: true },
    orderBy: { refundNo: "asc" },
  })

  const seen = new Set<string>()
  const numbers: string[] = []
  for (const row of refunds) {
    const seq = parseRefundRunningSeq(row.refundNo)
    if (!seq || seen.has(seq)) continue
    seen.add(seq)
    numbers.push(seq)
  }

  numbers.sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
  return numbers
}

async function listCollectorRunningNumbers(
  db: RunningNumbersDb,
  input: { branchId: string; year: number; month: number }
): Promise<string[]> {
  const branchId = input.branchId.trim()
  if (!branchId) return []

  const y = Number(input.year)
  const m = Number(input.month)
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return []
  }

  const { start, end } = bangkokMonthRange(y, m)
  const collectors = await db.collectorReport.findMany({
    where: {
      branchId,
      createdAt: { gte: start, lte: end },
    },
    select: { collectNo: true },
    orderBy: { collectNo: "asc" },
  })

  const seen = new Set<string>()
  const numbers: string[] = []
  for (const row of collectors) {
    const seq = parseCollectorRunningSeq(row.collectNo)
    if (!seq || seen.has(seq)) continue
    seen.add(seq)
    numbers.push(seq)
  }

  numbers.sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
  return numbers
}

/** Available running sequences for POS Document Lookup dropdown doc types. */
export async function listDocumentLookupRunningNumbers(
  db: RunningNumbersDb,
  input: ListDocumentLookupRunningNumbersInput
): Promise<string[]> {
  switch (input.docType) {
    case "refund":
      return listRefundRunningNumbers(db, input)
    case "collector":
      return listCollectorRunningNumbers(db, input)
    case "read-z":
    case "receipt":
      return []
    default: {
      const _exhaustive: never = input.docType
      return _exhaustive
    }
  }
}
