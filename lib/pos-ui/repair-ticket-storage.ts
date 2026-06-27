export type RepairTicketRecord = {
  ticketNo: string
  fileName?: string
  /** Public Vercel Blob url from upload or list API. */
  url?: string
  /** Blob pathname e.g. repair/REP-SH001-202606-0004-01.jpg */
  blobPath?: string
  createdAt: string
  branchCode: string
  staffId: string
}

export const REPAIR_TICKETS_STORAGE_KEY = "pos_repair_tickets"
export const REPAIR_PICKUP_WARN_DAYS = 30

export function loadRepairTicketsFromStorage(): RepairTicketRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(REPAIR_TICKETS_STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    return arr.filter(
      (x): x is RepairTicketRecord =>
        x &&
        typeof (x as RepairTicketRecord).ticketNo === "string" &&
        typeof (x as RepairTicketRecord).createdAt === "string"
    )
  } catch {
    return []
  }
}

export function appendRepairTicketRecord(rec: RepairTicketRecord): RepairTicketRecord[] {
  const list = loadRepairTicketsFromStorage()
  list.unshift(rec)
  const next = list.slice(0, 200)
  localStorage.setItem(REPAIR_TICKETS_STORAGE_KEY, JSON.stringify(next))
  return next
}

export function buildRepairTicketNo(branchCode: string): string {
  const code = branchCode.toUpperCase() || "SHOP"
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const periodKey = `${yyyy}${mm}`
  const counterKey = `pos-repair-ticket-counter-${code}-${periodKey}`
  const current = Number(localStorage.getItem(counterKey) || "0")
  const next = current + 1
  localStorage.setItem(counterKey, String(next))
  return `REP-${code}-${periodKey}-${String(next).padStart(4, "0")}`
}
