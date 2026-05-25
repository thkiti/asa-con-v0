import { NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { postDocument } from "@/lib/stock/posting"
import { PostingError } from "@/lib/stock/posting-errors"

type Context = {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const body = (await req.json().catch(() => ({}))) as { staffId?: string }
    const staffId = String(body.staffId ?? "").trim()

    if (!staffId) {
      return NextResponse.json({ error: "Missing staffId" }, { status: 400 })
    }

    const result = await postDocument({
      documentId: id,
      postedByStaffId: staffId,
    })

    return NextResponse.json(result.document)
  } catch (err: unknown) {
    if (err instanceof PostingError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      )
    }
    const message = err instanceof Error ? err.message : "Post failed"
    console.error("POST stock-document error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}