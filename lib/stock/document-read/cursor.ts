export type ListCursorPayload = {
  createdAt: string
  id: string
}

export function encodeListCursor(payload: ListCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
}

export function decodeListCursor(cursor: string): ListCursorPayload | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8")
    const parsed = JSON.parse(raw) as ListCursorPayload
    if (!parsed?.createdAt || !parsed?.id) return null
    const date = new Date(parsed.createdAt)
    if (Number.isNaN(date.getTime())) return null
    return { createdAt: parsed.createdAt, id: String(parsed.id) }
  } catch {
    return null
  }
}
