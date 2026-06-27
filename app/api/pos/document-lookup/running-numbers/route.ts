import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { posApiErrorResponse } from "@/app/api/pos/shared/pos-api-errors"
import { getSession } from "@/lib/auth/session"
import { listDocumentLookupRunningNumbers } from "@/lib/pos/document-lookup-running-numbers"
import {
  isPosDocumentLookupDocTypeEnabled,
  type PosDocumentLookupDocType,
} from "@/lib/pos-ui/document-lookup-doc-types"
import { prisma } from "@/lib/shared/prisma"
import {
  requireStockDocumentSession,
  resolveListBranchId,
} from "@/lib/stock/document-read/document-access"

const DOC_TYPES = new Set<PosDocumentLookupDocType>([
  "receipt",
  "refund",
  "collector",
  "read-z",
])

function parseDocType(value: string | null): PosDocumentLookupDocType | null {
  const trimmed = String(value ?? "").trim() as PosDocumentLookupDocType
  return DOC_TYPES.has(trimmed) ? trimmed : null
}

export async function GET(req: NextRequest) {
  try {
    const session = requireStockDocumentSession(await getSession())
    const branchId = resolveListBranchId(
      session,
      req.nextUrl.searchParams.get("branchId")
    )
    const docType = parseDocType(req.nextUrl.searchParams.get("docType"))
    if (!docType) {
      return NextResponse.json({ error: "Invalid doc type" }, { status: 400 })
    }
    if (!isPosDocumentLookupDocTypeEnabled(docType) || docType === "receipt") {
      return NextResponse.json({ runningNumbers: [] })
    }

    const year = Number(req.nextUrl.searchParams.get("year"))
    const month = Number(req.nextUrl.searchParams.get("month"))

    const runningNumbers = await listDocumentLookupRunningNumbers(prisma, {
      branchId,
      docType,
      year,
      month,
    })

    return NextResponse.json({ runningNumbers })
  } catch (err: unknown) {
    return posApiErrorResponse(err, "GET /api/pos/document-lookup/running-numbers")
  }
}
