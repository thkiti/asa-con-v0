import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { masterErrorResponse } from "@/app/api/master/shared/master-api-errors"
import { getSession } from "@/lib/auth/session"
import {
  createProductWithReference,
  parseCreateProductWithReferenceBody,
} from "@/lib/master"
import { requireMasterDatabaseSession } from "@/lib/permissions/master"
import { prisma } from "@/lib/shared/prisma"

export async function POST(req: NextRequest) {
  try {
    requireMasterDatabaseSession(await getSession())
    const body = parseCreateProductWithReferenceBody(await req.json())
    const item = await createProductWithReference(prisma, body)
    return NextResponse.json({ item }, { status: 201 })
  } catch (err: unknown) {
    return masterErrorResponse(err, "POST /api/master/products")
  }
}
