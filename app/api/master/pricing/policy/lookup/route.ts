import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import { getActivePricingPolicy, parsePolicyLookupQuery } from "@/lib/pricing"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

export async function GET(req: NextRequest) {
  try {
    requireMasterDatabaseSession(await getSession())
    const query = parsePolicyLookupQuery(req.nextUrl.searchParams)
    const policy = await getActivePricingPolicy(prisma, query)
    return NextResponse.json({ policy })
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/master/pricing/policy/lookup")
  }
}
