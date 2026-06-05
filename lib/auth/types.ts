import type { Role } from "@/lib/shared"

/** Minimal authenticated user — no password, no ORM types in UI layer. */
export type SessionUser = {
  sessionId: string
  userId: string
  role: Role
  staffId: string
  name: string
  branchId: string
  branchCode: string
  branchName: string
}

export type SessionCookiePayload = {
  sessionId: string | undefined
  userId: string | undefined
  role: string | undefined
  staffId: string | undefined
  name: string | undefined
  branchId: string | undefined
  branchCode: string | undefined
  branchName: string | undefined
  sessionExpiresAt: string | undefined
}