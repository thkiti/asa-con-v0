import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { bankDepositSettlementErrorResponse } from "@/app/api/finance/pos-settlement/shared/bank-deposit-api-errors"
import { requireFinanceVoucherScope } from "@/app/api/finance/shared/voucher-api-scope"
import { uploadPayInEvidenceForCollectorReport } from "@/lib/finance/pos-settlement/pay-in-evidence-upload"
import { normalizeMimeType } from "@/lib/document-archive/validation"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "@/lib/finance/pos-settlement/pos-settlement-errors"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import { prisma } from "@/lib/shared/prisma"

function parseCollectorReportIds(
  primaryId: string,
  rawIds: FormDataEntryValue | null
): string[] {
  const ids = new Set<string>()
  if (primaryId) ids.add(primaryId)

  if (typeof rawIds === "string" && rawIds.trim()) {
    try {
      const parsed = JSON.parse(rawIds) as unknown
      if (Array.isArray(parsed)) {
        for (const value of parsed) {
          const id = String(value ?? "").trim()
          if (id) ids.add(id)
        }
      }
    } catch {
      throw new PosSettlementError(
        "collectorReportIds must be a JSON array",
        PosSettlementErrorCodes.INVALID_SOURCE,
        400
      )
    }
  }

  return [...ids]
}

export async function POST(req: Request) {
  try {
    const { actor, legalEntityCode } = await requireFinanceVoucherScope(req)

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
    const collectorReportIds = parseCollectorReportIds(
      collectorReportId,
      form.get("collectorReportIds")
    )
    const staffIdRaw = form.get("staffId")
    const staffId =
      typeof staffIdRaw === "string" ? staffIdRaw.trim() : actor.staffId?.trim() ?? ""

    if (!collectorReportId) {
      throw new PosSettlementError(
        "collectorReportId is required",
        PosSettlementErrorCodes.COLLECTOR_REPORT_NOT_FOUND,
        400
      )
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const originalName =
      file instanceof File && file.name ? file.name : null
    const mimeType = normalizeMimeType(
      originalName,
      typeof file.type === "string" && file.type ? file.type : null
    )

    const result = await uploadPayInEvidenceForCollectorReport(prisma, {
      collectorReportId,
      collectorReportIds,
      staffId,
      fileBuffer: buf,
      contentType: mimeType,
      originalFilename: originalName,
      uploadedByStaffId: actor.staffId,
      legalEntityCode,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    return bankDepositSettlementErrorResponse(
      err,
      "POST finance/pos-settlement/pay-in/evidence/upload"
    )
  }
}
