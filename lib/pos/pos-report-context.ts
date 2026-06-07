import type { SessionUser } from "@/lib/auth/types"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { requireStockDocumentSession } from "@/lib/stock/document-read"

export type PosReportContext = {
  branchId: string
  branchCode: string
  branchName: string
  sessionStaffId: string
}

export function requirePosReportContext(
  session: SessionUser | null
): PosReportContext {
  const user = requireStockDocumentSession(session)
  const branchId = user.branchId.trim()
  const branchCode = user.branchCode.trim()
  const sessionStaffId = user.staffId.trim()
  const branchName = user.branchName?.trim() ?? ""

  if (!branchId || !branchCode || !sessionStaffId) {
    throw new PosLookupError("Unauthorized", "UNAUTHORIZED", 401)
  }

  return { branchId, branchCode, branchName, sessionStaffId }
}
