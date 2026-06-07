import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { requireCatalogImageSession } from "@/lib/catalog-image/catalog-image-access"
import { catalogImageErrorResponse } from "@/lib/catalog-image/errors"
import { matchCatalogProductCode } from "@/lib/catalog-image/match-product"
import { prisma } from "@/lib/shared/prisma"

type MatchCodeBody = {
  rawCode?: string
}

export async function POST(req: Request) {
  try {
    requireCatalogImageSession(await getSession())
    const body = (await req.json()) as MatchCodeBody
    const result = await matchCatalogProductCode(prisma, String(body.rawCode ?? ""))
    return NextResponse.json(result)
  } catch (err: unknown) {
    return catalogImageErrorResponse(err, "POST catalog-image/match-code error")
  }
}
