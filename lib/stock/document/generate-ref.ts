import type { DocType, Prisma } from "@/generated/prisma/client"

const REF_PREFIX_BY_DOC_TYPE: Partial<Record<DocType, string>> = {
  PURCHASE: "PUR",
  TRANSFER_OUT: "TRO",
  TRANSFER_IN: "TRI",
  ADJUSTMENT: "ADJ",
  PERFORMANCE: "PER",
}

/** Compact YYYYMM period key for refNo and DocumentCounter (legacy-aligned). */
export function refPeriodKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${y}${m}`
}

export async function generateRunningRef(
  tx: Prisma.TransactionClient,
  docType: DocType,
  date: Date,
  branchCode: string
): Promise<string> {
  const prefix = REF_PREFIX_BY_DOC_TYPE[docType]
  if (!prefix) {
    throw new Error(`Invalid docType for ref generation: ${docType}`)
  }

  const period = refPeriodKey(date)
  const code = branchCode.trim().toUpperCase()
  if (!code) {
    throw new Error("branchCode is required for ref generation")
  }

  const counter = await tx.documentCounter.upsert({
    where: {
      docType_shopId_period: {
        docType: prefix,
        shopId: code,
        period,
      },
    },
    update: {
      running: { increment: 1 },
    },
    create: {
      docType: prefix,
      shopId: code,
      period,
      running: 1,
    },
  })

  const runningStr = String(counter.running).padStart(
    docType === "TRANSFER_IN" ? 3 : 4,
    "0"
  )

  return `${prefix}-${code}-${period}-${runningStr}`
}
