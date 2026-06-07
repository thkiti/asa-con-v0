import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import { listActiveShopBranches } from "@/lib/shop"
import { prisma } from "@/lib/shared/prisma"

export async function GET() {
  const branches = await listActiveShopBranches(prisma)
  return NextResponse.json({ branches })
}
