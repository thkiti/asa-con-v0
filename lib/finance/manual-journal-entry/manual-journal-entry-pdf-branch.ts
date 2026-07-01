import type { Prisma } from "@/generated/prisma/client"
import {
  formatFinanceBranchLabel,
  FINANCE_BRANCH_UNASSIGNED_LABEL,
} from "@/lib/finance-ui/finance-branch-display"
import type { ManualJournalEntryPdfSnapshot } from "./manual-journal-entry-pdf-snapshot-types"

type BranchLookupClient = Pick<Prisma.TransactionClient, "branch">

/** Resolve branch display for archived PDF — snapshot fields first, then DB lookup. */
export async function resolveManualJournalEntrySnapshotBranchLabel(
  client: BranchLookupClient,
  snapshot: ManualJournalEntryPdfSnapshot
): Promise<string> {
  const fromSnapshot = formatFinanceBranchLabel({
    branchCode: snapshot.branchCode,
    branchName: snapshot.branchName,
  })
  if (fromSnapshot !== FINANCE_BRANCH_UNASSIGNED_LABEL) {
    return fromSnapshot
  }

  const branchId = String(snapshot.branchId ?? "").trim()
  if (!branchId) return FINANCE_BRANCH_UNASSIGNED_LABEL

  const branch = await client.branch.findUnique({
    where: { id: branchId },
    select: { code: true, name: true },
  })
  if (!branch) return FINANCE_BRANCH_UNASSIGNED_LABEL

  return formatFinanceBranchLabel({
    branchCode: branch.code,
    branchName: branch.name,
  })
}
