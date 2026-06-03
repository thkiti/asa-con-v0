import type { SessionUserApi } from "@/lib/auth/session-user-api"

export type FetchSessionResult =
  | { ok: true; user: SessionUserApi }
  | { ok: false; status: number }

export async function fetchSessionUser(
  fetchFn: typeof fetch = fetch
): Promise<FetchSessionResult> {
  const res = await fetchFn("/api/auth/session", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  if (res.status === 401) {
    return { ok: false, status: 401 }
  }

  if (!res.ok) {
    return { ok: false, status: res.status }
  }

  const payload = (await res.json()) as { user?: SessionUserApi | null }
  if (!payload.user) {
    return { ok: false, status: 401 }
  }

  return { ok: true, user: payload.user }
}
