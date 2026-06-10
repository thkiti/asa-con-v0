import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"

import {
  GL_ACCOUNT_CSV_TEMPLATE_EXAMPLE,
  GL_ACCOUNT_CSV_TEMPLATE_HEADER,
} from "@/lib/finance/gl-account-import-types"

export async function GET() {
  const csv = `${GL_ACCOUNT_CSV_TEMPLATE_HEADER}\n${GL_ACCOUNT_CSV_TEMPLATE_EXAMPLE}\n`
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="chart-of-accounts-template.csv"',
    },
  })
}
