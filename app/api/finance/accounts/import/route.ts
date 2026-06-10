import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import { readCoaCsvFromRequest } from "@/app/api/finance/shared/parse-coa-csv-upload"
import {
  getSession,
  PeriodAdminAuthError,
  requirePeriodAdminActor,
} from "@/lib/auth"
import { parseGlAccountCsv } from "@/lib/finance/gl-account-csv-parser"
import {
  applyGlAccountImport,
  buildImportPreview,
} from "@/lib/finance/gl-account-import"
import { prisma } from "@/lib/shared/prisma"

export async function POST(req: NextRequest) {
  try {
    requirePeriodAdminActor(await getSession())
    const content = await readCoaCsvFromRequest(req)
    const parsed = parseGlAccountCsv(content)
    const preview = await buildImportPreview(
      prisma,
      parsed.rows,
      parsed.errors,
      parsed.warnings
    )

    const result = await prisma.$transaction((tx) =>
      applyGlAccountImport(tx, preview)
    )

    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof PeriodAdminAuthError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    return financeErrorResponse(err, "POST /api/finance/accounts/import")
  }
}
