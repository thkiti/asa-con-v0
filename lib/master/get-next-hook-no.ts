import type { PrismaClient } from "@/generated/prisma/client"

type HookNoDb = Pick<PrismaClient, "referenceStock">

export async function getNextHookNo(db: HookNoDb, hookGroup: string): Promise<number> {
  const normalized = String(hookGroup || "").trim().toUpperCase()
  if (!normalized) {
    return 1
  }

  const last = await db.referenceStock.findFirst({
    where: { hookGroup: normalized, deleted: false },
    orderBy: { hookNo: "desc" },
    select: { hookNo: true },
  })

  return (last?.hookNo ?? 0) + 1
}
