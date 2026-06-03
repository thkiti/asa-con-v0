"use client"

import { ThemeSelector } from "@/components/theme/ThemeSelector"
import { postCredentialLogin } from "@/lib/auth/login-client"
import {
  themeBtnPrimary,
  themeCard,
  themeInput,
  themeLinkMuted,
  themeMuted,
} from "@/lib/theme/theme-classes"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState } from "react"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") ?? ""

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = username.trim().length > 0 && password.length > 0

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError(null)

    try {
      const result = await postCredentialLogin({
        username: username.trim(),
        password,
        returnTo: returnTo || undefined,
      })

      router.push(result.redirectTo)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง")
    } finally {
      setLoading(false)
    }
  }

  async function onLogout() {
    setLoading(true)
    setError(null)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout ไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-md">
      <div className="mb-4 flex justify-end">
        <ThemeSelector />
      </div>

      <div className={themeCard}>
        <h1 className="text-xl font-semibold">เข้าสู่ระบบ</h1>
        <p className={`mt-2 text-sm ${themeMuted}`}>
          เข้าสู่ระบบด้วยรหัสพนักงานและรหัสผ่าน
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm">
            <span className="font-medium">รหัสพนักงาน</span>
            <input
              name="username"
              className={themeInput}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="001"
              autoComplete="username"
              disabled={loading}
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">รหัสผ่าน</span>
            <input
              name="password"
              type="password"
              className={themeInput}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
          </label>

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className={themeBtnPrimary}
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void onLogout()}
          disabled={loading}
          className={`mt-6 text-sm ${themeLinkMuted}`}
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  )
}
