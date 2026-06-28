import type { Prisma } from "@/generated/prisma/client"
import {
  resolveAccountsForPosCollectorPickup,
} from "@/lib/finance/account-map"
import { resolveAccountIds, postOperationalVoucher } from "@/lib/finance/posting"
import { assertPostingPeriodOpen } from "@/lib/finance/posting-period"
import {
  FINANCE_REF_TYPES,
  type PostedVoucherResult,
} from "@/lib/finance/posting-types"
import {
  DEFAULT_DOCUMENT_ENTITY_CODE,
  type DocumentEntityCode,
} from "@/lib/legal-entity/constants"
import { resolvePosLegalEntityCode } from "@/lib/pos/resolve-pos-sale-vat"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import { PSV_COLLECTOR_PICKUP_DOCUMENT_CODE } from "./constants"
import { extractCollectorPickupCashAmount } from "./collector-cash-amount"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "./pos-settlement-errors"

export type PostCollectorPickupSettlementInput = {
  tx: Prisma.TransactionClient
  collectorReportId: string
  /** Defaults to collector report createdAt when omitted. */
  postingDate?: Date
  legalEntityCode?: DocumentEntityCode
}

export type CollectorReportSettlementSource = {
  id: string
  branchId: string
  collectNo: string
  reportJson: unknown
  createdAt: Date
}

type CollectorPickupDb = Pick<Prisma.TransactionClient, "collectorReport" | "voucher">

function assertPosSettlementLegalEntity(
  legalEntityCode?: DocumentEntityCode
): DocumentEntityCode {
  const resolved = legalEntityCode ?? resolvePosLegalEntityCode()
  if (resolved !== DEFAULT_DOCUMENT_ENTITY_CODE) {
    throw new PosSettlementError(
      "POS settlement is AS / ASAS only",
      PosSettlementErrorCodes.FORBIDDEN_LEGAL_ENTITY,
      403
    )
  }
  return resolved
}

function parseCollectorReportJson(reportJson: unknown): ReadReportPayload {
  if (reportJson == null || typeof reportJson !== "object") {
    throw new PosSettlementError(
      "Collector report payload is invalid",
      PosSettlementErrorCodes.INVALID_SOURCE
    )
  }
  return reportJson as ReadReportPayload
}

export async function loadCollectorReportForSettlement(
  db: CollectorPickupDb,
  collectorReportId: string
): Promise<CollectorReportSettlementSource> {
  const id = String(collectorReportId ?? "").trim()
  if (!id) {
    throw new PosSettlementError(
      "collectorReportId is required",
      PosSettlementErrorCodes.COLLECTOR_REPORT_NOT_FOUND,
      400
    )
  }

  const row = await db.collectorReport.findUnique({
    where: { id },
    select: {
      id: true,
      branchId: true,
      collectNo: true,
      reportJson: true,
      createdAt: true,
    },
  })

  if (!row) {
    throw new PosSettlementError(
      "Collector report not found",
      PosSettlementErrorCodes.COLLECTOR_REPORT_NOT_FOUND,
      404
    )
  }

  return row
}

export async function assertCollectorPickupNotYetPosted(
  tx: Prisma.TransactionClient,
  collectorReportId: string
): Promise<void> {
  const existing = await tx.voucher.findUnique({
    where: {
      refType_refId: {
        refType: FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP,
        refId: collectorReportId,
      },
    },
    include: { journalEntry: true },
  })

  if (existing?.journalEntry) {
    throw new PosSettlementError(
      "Collector pickup settlement already posted for this report",
      PosSettlementErrorCodes.DUPLICATE_SOURCE,
      409
    )
  }
}

export async function postCollectorPickupSettlement(
  input: PostCollectorPickupSettlementInput
): Promise<PostedVoucherResult> {
  if (!input.tx) {
    throw new PosSettlementError(
      "postCollectorPickupSettlement requires caller transaction (tx)",
      PosSettlementErrorCodes.INVALID_SOURCE,
      500
    )
  }

  const legalEntityCode = assertPosSettlementLegalEntity(input.legalEntityCode)
  const source = await loadCollectorReportForSettlement(
    input.tx,
    input.collectorReportId
  )
  const report = parseCollectorReportJson(source.reportJson)
  const cashAmount = extractCollectorPickupCashAmount(report)
  const postingDate = input.postingDate ?? source.createdAt

  await assertCollectorPickupNotYetPosted(input.tx, source.id)
  await assertPostingPeriodOpen(input.tx, postingDate, legalEntityCode)

  const codeLines = resolveAccountsForPosCollectorPickup(cashAmount)
  const lines = await resolveAccountIds(input.tx, codeLines)

  const posted = await postOperationalVoucher({
    tx: input.tx,
    branchId: source.branchId,
    date: postingDate,
    legalEntityCode,
    refType: FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP,
    refId: source.id,
    refNo: source.collectNo,
    description: `${PSV_COLLECTOR_PICKUP_DOCUMENT_CODE} collector pickup`,
    lines,
  })

  if (posted.alreadyPosted) {
    throw new PosSettlementError(
      "Collector pickup settlement already posted for this report",
      PosSettlementErrorCodes.DUPLICATE_SOURCE,
      409
    )
  }

  return posted
}
