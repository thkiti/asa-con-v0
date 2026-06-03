import type { SessionUserApi } from "./session-user-api"

import { mapLoginErrorCode } from "./login-ui-messages"

export type LoginRequest = {
  username: string
  password: string
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

export async function postCredentialLogin(
  input: LoginRequest
): Promise<LoginSuccessResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: input.username,
      password: input.password,
      returnTo: input.returnTo || undefined,
    }),
  })

  const payload = (await response.json()) as {
    error?: string
    code?: string
    redirectTo?: string
    user?: SessionUserApi
  }

  if (!response.ok) {
    throw new LoginRequestError(
      mapLoginErrorCode(payload.code, payload.error),
      payload.code
    )
  }

  if (!payload.redirectTo || !payload.user) {
    throw new LoginRequestError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง")
  }

  return {
    redirectTo: payload.redirectTo,
    user: payload.user,
  }
}
