import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  createPricingPolicy,
  listPricingPolicies,
  parseCreatePricingPolicyBody,
} from "@/lib/pricing"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

export async function GET() {
  try {
    requireMasterDatabaseSession(await getSession())
    const items = await listPricingPolicies(prisma)
    return NextResponse.json({ items })
  } catch (err: unknown) {
    return masterErrorResponse(err, "GET /api/master/pricing/policy")
  }
}

export async function POST(req: NextRequest) {
  try {
    requireMasterDatabaseSession(await getSession())
    const body = parseCreatePricingPolicyBody(await req.json())
    const item = await createPricingPolicy(prisma, body)
    return NextResponse.json({ item }, { status: 201 })
  } catch (err: unknown) {
    return masterErrorResponse(err, "POST /api/master/pricing/policy")
  }
}
