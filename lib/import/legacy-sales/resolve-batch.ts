import type { PrismaClient } from "@/generated/prisma/client"

export async function resolveLegacySalesBatchId(
  db: Pick<PrismaClient, "legacySalesImportBatch">,
  batchArg?: string
): Promise<string> {
  const value = batchArg?.trim()
  if (value && value !== "latest") {
    return value
  }

  const latest = await db.legacySalesImportBatch.findFirst({
    orderBy: { startedAt: "desc" },
    select: { id: true },
  })

  if (!latest) {
    throw new Error("No legacy sales import batch found")
  }

  return latest.id
}
