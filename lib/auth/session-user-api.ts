import type { SessionUser } from "./types"

/** Public session shape for API responses (no opaque session id). */
export type SessionUserApi = {
  userId: string
  staffId: string
  name: string
  role: SessionUser["role"]
  branchId: string
  branchCode: string
  branchName: string
}

export function toSessionUserApi(user: SessionUser): SessionUserApi {
  return {
    userId: user.userId,
    staffId: user.staffId,
    name: user.name,
    role: user.role,
    branchId: user.branchId,
    branchCode: user.branchCode,
    branchName: user.branchName,
  }
}
