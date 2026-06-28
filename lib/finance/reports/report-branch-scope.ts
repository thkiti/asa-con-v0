import type { BranchLookupPrisma } from "@/lib/finance/resolve-branch-id"
import { resolveBranchId } from "@/lib/finance/resolve-branch-id"
import type { FinanceReportScope } from "./report-filter"

/** Resolve branch filter key (Branch.id or Branch.code) to Branch.id before report queries. */
export async function applyReportBranchScope<T extends FinanceReportScope>(
  prisma: BranchLookupPrisma,
  filter: T
): Promise<T> {
  const key = filter.branchId?.trim()
  if (!key) {
    return filter
  }
  const branchId = await resolveBranchId(prisma, key)
  return { ...filter, branchId: branchId! }
}
