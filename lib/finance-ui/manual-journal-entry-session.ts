import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import type { Role } from "@/lib/shared"

export type ManualJournalSessionContext = {
  staffId: string
  branchId: string
  branchCode: string
  branchName: string
  documentEntityCode: DocumentEntityCode
  role: Role
}

export async function fetchManualJournalSessionContext(): Promise<
  ManualJournalSessionContext | null
> {
  const res = await fetch("/api/auth/session")
  if (!res.ok) return null
  const body = (await res.json()) as {
    user?: {
      staffId?: string
      branchId?: string
      branchCode?: string
      branchName?: string
      documentEntityCode?: DocumentEntityCode
      role?: Role
    } | null
  }
  const user = body.user
  if (!user?.staffId?.trim() || !user.branchId?.trim() || !user.role) return null
  return {
    staffId: user.staffId.trim(),
    branchId: user.branchId.trim(),
    branchCode: user.branchCode?.trim() ?? "",
    branchName: user.branchName?.trim() ?? "",
    documentEntityCode: user.documentEntityCode ?? "AS",
    role: user.role,
  }
}
