import type { SessionUser } from "@/lib/auth/types"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { requireStockDocumentSession } from "@/lib/stock/document-read"

export function isPosShopBranchCode(code: string): boolean {
  return code.trim().toUpperCase().startsWith("SH")
}

export function requirePosShopSession(session: SessionUser | null): SessionUser {
  const user = requireStockDocumentSession(session)
  if (!isPosShopBranchCode(user.branchCode)) {
    throw new PosLookupError(
      "Full POS requires a shop branch",
      "POS_SHOP_BRANCH_REQUIRED",
      403
    )
  }
  return user
}
