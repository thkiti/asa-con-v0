/** รหัสก่อน `•` ถ้ามี (รูปแบบ `001 • ชื่อ`) — ไม่มี `•` คือรหัสล้วน */
export function parseStaffIdFromPosInput(raw: string): string {
  const t = raw.trim()
  const j = t.indexOf("•")
  if (j === -1) return t
  return t.slice(0, j).trim()
}

/** รูปแบบ `รหัสพนักงาน/รหัสผ่าน` — แบ่งที่ `/` ตัวแรก */
export function parseStaffSlashPassword(
  input: string
): { staffCode: string; password: string } | null {
  const t = input.trim()
  const i = t.indexOf("/")
  if (i <= 0) return null
  const code = t.slice(0, i).trim()
  const pw = t.slice(i + 1)
  if (!code || !pw) return null
  return { staffCode: code, password: pw }
}

export function bangkokTodayYmdClient(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}
