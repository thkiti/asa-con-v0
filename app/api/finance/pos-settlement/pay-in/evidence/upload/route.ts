import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { bankDepositSettlementErrorResponse } from "@/app/api/finance/pos-settlement/shared/bank-deposit-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { uploadPayInEvidenceForCollectorReport } from "@/lib/finance/pos-settlement/pay-in-evidence-upload"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "@/lib/finance/pos-settlement/pos-settlement-errors"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import { prisma } from "@/lib/shared/prisma"

export async function POST(req: Request) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope()

    if (legalEntityCode !== DEFAULT_DOCUMENT_ENTITY_CODE) {
      throw new PosSettlementError(
        "POS settlement is AS / ASAS only",
        PosSettlementErrorCodes.FORBIDDEN_LEGAL_ENTITY,
        403
      )
    }

    const form = await req.formData()
    const file = form.get("file")
    const collectorReportIdRaw = form.get("collectorReportId")

    if (!(file instanceof Blob) || typeof collectorReportIdRaw !== "string") {
      throw new PosSettlementError(
        "Invalid upload body — file and collectorReportId are required",
        PosSettlementErrorCodes.INVALID_SOURCE,
        400
      )
    }

    const collectorReportId = collectorReportIdRaw.trim()
    if (!collectorReportId) {
      throw new PosSettlementError(
        "collectorReportId is required",
        PosSettlementErrorCodes.COLLECTOR_REPORT_NOT_FOUND,
        400
      )
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const contentType =
      typeof file.type === "string" && file.type.startsWith("image/")
        ? file.type
        : "image/jpeg"
    const originalFilename =
      file instanceof File && file.name ? file.name : null

    const result = await uploadPayInEvidenceForCollectorReport(prisma, {
      collectorReportId,
      fileBuffer: buf,
      contentType,
      originalFilename,
      uploadedByStaffId: actor.staffId,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    return bankDepositSettlementErrorResponse(
      err,
      "POST finance/pos-settlement/pay-in/evidence/upload"
    )
  }
}
