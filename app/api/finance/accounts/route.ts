import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { GlAccountType } from "@/generated/prisma/client"
import { financeErrorResponse } from "@/app/api/finance/shared/finance-api-errors"
import {
  getGlAccountTree,
  listGlAccounts,
  type GlAccountListFilter,
} from "@/lib/finance/gl-account-list"
import { prisma } from "@/lib/shared/prisma"

function parseAccountType(value: string | null): GlAccountType | undefined {
  if (!value?.trim()) return undefined
  const raw = value.trim().toUpperCase()
  if ((Object.values(GlAccountType) as string[]).includes(raw)) {
    return raw as GlAccountType
  }
  return undefined
}

function parseListFilter(params: URLSearchParams): GlAccountListFilter {
  const accountType = parseAccountType(params.get("accountType"))
  const isActiveRaw = params.get("isActive")?.trim().toLowerCase()
  let isActive: GlAccountListFilter["isActive"] = "true"
  if (isActiveRaw === "false") isActive = "false"
  else if (isActiveRaw === "all") isActive = "all"

  const limitParam = params.get("limit")
  const offsetParam = params.get("offset")
  let limit: number | undefined
  let offset: number | undefined

  if (limitParam?.trim()) {
    const n = Number(limitParam.trim())
    if (Number.isFinite(n) && n > 0) limit = Math.min(n, 500)
  }
  if (offsetParam?.trim()) {
    const n = Number(offsetParam.trim())
    if (Number.isFinite(n) && n >= 0) offset = n
  }

  return {
    accountType,
    isActive,
    search: params.get("search")?.trim() || undefined,
    includeDeleted: params.get("includeDeleted") === "true",
    limit,
    offset,
  }
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams
    const filter = parseListFilter(params)
    const view = params.get("view")?.trim().toLowerCase()

    if (view === "tree") {
      const tree = await getGlAccountTree(prisma, filter)
      return NextResponse.json({ view: "tree", accounts: tree, total: tree.length })
    }

    const result = await listGlAccounts(prisma, filter)
    return NextResponse.json({ view: "flat", ...result })
  } catch (err: unknown) {
    return financeErrorResponse(err, "GET /api/finance/accounts")
  }
}
