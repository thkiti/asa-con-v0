import type { Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { postBankDepositSettlement } from "@/lib/finance/pos-settlement/post-bank-deposit"
import type { PostedVoucherResult } from "@/lib/finance/posting-types"
import { prisma } from "@/lib/shared/prisma"

export type PostBankDepositFromReportInput = {
  collectorReportId: string
  postingDate?: Date
  legalEntityCode?: DocumentEntityCode
  tx?: Prisma.TransactionClient
}

/** Bridge posted collector pickup → Stage 2 PSV-BANK-DEP posting. */
export async function postBankDepositFromReport(
  input: PostBankDepositFromReportInput
): Promise<PostedVoucherResult> {
  const run = (tx: Prisma.TransactionClient) =>
    postBankDepositSettlement({
      tx,
      collectorReportId: input.collectorReportId,
      postingDate: input.postingDate,
      legalEntityCode: input.legalEntityCode,
    })

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
