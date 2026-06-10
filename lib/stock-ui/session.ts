import type { Role } from "@/lib/shared"
import { StockDocumentUiError, StockUiErrorCodes } from "./document-errors"

export type ShopSessionVM = {
  sessionId: string
  role: Role
  staffId: string
  name: string
  branchId: string
  branchCode: string
  branchName: string
}

type SessionResponse = {
  user: ShopSessionVM | null
}

export async function fetchShopSession(): Promise<ShopSessionVM> {
  const res = await fetch("/api/auth/session")
  if (res.status === 401) {
    throw new StockDocumentUiError(
      "Please sign in again.",
      StockUiErrorCodes.UNAUTHENTICATED
    )
  }
  if (!res.ok) {
    throw new StockDocumentUiError("Failed to load session", StockUiErrorCodes.REQUEST_FAILED)
  }
  const body = (await res.json()) as SessionResponse
  if (!body.user?.branchId?.trim()) {
    throw new StockDocumentUiError(
      "Session is missing branch context.",
      StockUiErrorCodes.BRANCH_ACCESS_DENIED
    )
  }
  return {
    ...body.user,
    branchCode: body.user.branchCode?.trim() ?? "",
    branchName: body.user.branchName?.trim() ?? "",
  }
}
