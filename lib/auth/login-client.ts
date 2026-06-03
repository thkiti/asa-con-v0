import type { SessionUserApi } from "./session-user-api"
import type { BranchPreview, StaffPreview } from "./login-preview"

import { mapLoginErrorCode } from "./login-ui-messages"

export type LoginRequest = {
  username: string
  password: string
  branchCode: string
  returnTo?: string
}

export type LoginSuccessResponse = {
  redirectTo: string
  user: SessionUserApi
}

export class LoginRequestError extends Error {
  readonly code: string | undefined

  constructor(message: string, code?: string) {
    super(message)
    this.name = "LoginRequestError"
    this.code = code
  }
}

async function parseAuthJson(response: Response): Promise<{
  error?: string
  code?: string
  redirectTo?: string
  user?: SessionUserApi
}> {
  return (await response.json()) as {
    error?: string
    code?: string
    redirectTo?: string
    user?: SessionUserApi
  }
}

function throwMappedError(
  payload: { error?: string; code?: string },
  response: Response
): never {
  throw new LoginRequestError(
    mapLoginErrorCode(payload.code, payload.error),
    payload.code
  )
}

export async function postStaffPreview(input: {
  staffId: string
}): Promise<StaffPreview> {
  const response = await fetch("/api/auth/staff-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId: input.staffId }),
  })

  const payload = await parseAuthJson(response)
  if (!response.ok) {
    throwMappedError(payload, response)
  }

  return payload as StaffPreview
}

export async function postBranchPreview(input: {
  branchCode: string
}): Promise<BranchPreview> {
  const response = await fetch("/api/auth/branch-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branchCode: input.branchCode }),
  })

  const payload = await parseAuthJson(response)
  if (!response.ok) {
    throwMappedError(payload, response)
  }

  return payload as BranchPreview
}

export async function postCredentialLogin(
  input: LoginRequest
): Promise<LoginSuccessResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: input.username,
      password: input.password,
      branchCode: input.branchCode,
      returnTo: input.returnTo || undefined,
    }),
  })

  const payload = await parseAuthJson(response)

  if (!response.ok) {
    throwMappedError(payload, response)
  }

  if (!payload.redirectTo || !payload.user) {
    throw new LoginRequestError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง")
  }

  return {
    redirectTo: payload.redirectTo,
    user: payload.user,
  }
}
