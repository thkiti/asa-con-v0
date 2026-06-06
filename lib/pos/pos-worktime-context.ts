import type { SessionUser } from "@/lib/auth/types"
import { WorktimeError } from "@/lib/pos/worktime-errors"
import { requireStockDocumentSession } from "@/lib/stock/document-read"

export type PosWorktimeContext = {
  branchId: string
  staffId: string
}

export function requirePosWorktimeContext(
  session: SessionUser | null
): PosWorktimeContext {
  const user = requireStockDocumentSession(session)
  const branchId = user.branchId.trim()
  const staffId = user.staffId.trim()

  if (!branchId) {
    throw new WorktimeError(
      "Shop session requires branchId",
      "MISSING_BRANCH",
      400
    )
  }
  if (!staffId) {
    throw new WorktimeError(
      "Shop session requires staffId",
      "MISSING_STAFF",
      400
    )
  }

  return { branchId, staffId }
}
