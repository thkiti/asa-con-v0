import type { DocumentKind } from "@/generated/prisma/client"
import type { BusinessPhaseCode } from "@/lib/stock-ui/business-phase-title"

/** Stock inquiry phase codes align with vault DocumentKind values. */
export function stockPhaseCodeToDocumentKind(
  phaseCode: BusinessPhaseCode
): DocumentKind {
  return phaseCode
}
