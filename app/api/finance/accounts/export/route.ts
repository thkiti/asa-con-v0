import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { GlAccountType } from "@/generated/prisma/client"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import {
  exportGlAccountsCsv,
  glAccountExportFilename,
} from "@/lib/finance/gl-account-export"
import type { GlAccountListFilter } from "@/lib/finance/gl-account-list"
import { prisma } from "@/lib/shared/prisma"

function parseExportFilter(params: URLSearchParams): Omit<GlAccountListFilter, "limit" | "offset"> {
  const accountTypeRaw = params.get("accountType")?.trim().toUpperCase()
  let accountType: GlAccountType | undefined
  if (accountTypeRaw && (Object.values(GlAccountType) as string[]).includes(accountTypeRaw)) {
    accountType = accountTypeRaw as GlAccountType
  }

  const isActiveRaw = params.get("isActive")?.trim().toLowerCase()
  let isActive: GlAccountListFilter["isActive"] = "all"
  if (isActiveRaw === "true") isActive = "true"
  else if (isActiveRaw === "false") isActive = "false"

  return {
    accountType,
    isActive,
    search: params.get("search")?.trim() || undefined,
    includeDeleted: params.get("includeDeleted") === "true",
  }
}

export async function GET(req: NextRequest) {
  try {
    const filter = parseExportFilter(req.nextUrl.searchParams)
    const csv = await exportGlAccountsCsv(prisma, filter)
    const filename = glAccountExportFilename()

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET /api/finance/accounts/export")
  }
}
