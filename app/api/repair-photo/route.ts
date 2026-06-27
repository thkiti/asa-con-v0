import { put } from "@vercel/blob"
import path from "path"
import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
import { getSession } from "@/lib/auth/session"
import { listRepairPhotos } from "@/lib/pos/repair-photo-list"

const REPAIR_PREFIX = "repair"

export async function GET() {
  const session = await getSession()
  if (!session?.sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const photos = await listRepairPhotos(session.branchCode)
    return NextResponse.json({ photos })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to list repair photos from Blob storage"
    console.error("REPAIR_PHOTO_LIST_ERROR:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function safeRepairFileName(name: string): string | null {
  const base = path.basename(String(name).trim())
  if (base.includes("..")) return null
  if (!/^REP-.+-\d{6}-\d{4}-\d{2}\.jpg$/i.test(base)) return null
  return base
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get("file")
  const fileNameRaw = form.get("fileName")

  if (!(file instanceof Blob) || typeof fileNameRaw !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const safe = safeRepairFileName(fileNameRaw)
  if (!safe) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  if (buf.length > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large" }, { status: 400 })
  }

  const pathname = `${REPAIR_PREFIX}/${safe}`
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim()

  try {
    const blob = await put(pathname, buf, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: false,
      allowOverwrite: true,
      ...(blobToken ? { token: blobToken } : {}),
    })

    return NextResponse.json({
      ok: true,
      fileName: safe,
      url: blob.url,
      pathname: blob.pathname,
    })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to upload to Blob storage"
    console.error("REPAIR_PHOTO_UPLOAD_ERROR:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
