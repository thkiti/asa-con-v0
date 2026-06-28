import type { Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { postCollectorPickupSettlement } from "@/lib/finance/pos-settlement/post-collector-pickup"
import type { PostedVoucherResult } from "@/lib/finance/posting-types"
import { prisma } from "@/lib/shared/prisma"

export type PostCollectorPickupFromReportInput = {
  collectorReportId: string
  postingDate?: Date
  legalEntityCode?: DocumentEntityCode
  tx?: Prisma.TransactionClient
}

/** Bridge persisted CollectorReport → Stage 2 PSV-COL-PICK posting. */
export async function postCollectorPickupFromReport(
  input: PostCollectorPickupFromReportInput
): Promise<PostedVoucherResult> {
  const run = (tx: Prisma.TransactionClient) =>
    postCollectorPickupSettlement({
      tx,
      collectorReportId: input.collectorReportId,
      postingDate: input.postingDate,
      legalEntityCode: input.legalEntityCode,
    })

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
