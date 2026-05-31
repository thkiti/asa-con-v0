import type { ReopenEvidenceDetail } from "@/lib/finance/reopen-evidence-types"

export type { ReopenEvidenceDetail } from "@/lib/finance/reopen-evidence-types"

export type ReopenEvidenceApiResult = {
  evidence: ReopenEvidenceDetail[]
}

export function buildReopenEvidencePath(periodId: string): string {
  return `/finance/periods/${encodeURIComponent(periodId.trim())}/reopen-evidence`
}
