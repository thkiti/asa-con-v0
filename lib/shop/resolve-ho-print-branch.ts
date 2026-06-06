import type { SessionUser } from "@/lib/auth/types"
import { isHoRole } from "@/lib/stock/document-read"

/**
 * Resolve branchId for receipt/refund print pages.
 * HO roles may pass ?branchId=; shop staff always use session branch.
 */
export function resolveHoPrintBranchId(
  session: SessionUser,
  queryBranchId?: string | null
): string {
  const sessionBranchId = session.branchId.trim()
  if (isHoRole(session.role)) {
    const query = String(queryBranchId ?? "").trim()
    if (query) return query
  }
  return sessionBranchId
}
