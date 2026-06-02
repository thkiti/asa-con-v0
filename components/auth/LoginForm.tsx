"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState } from "react"

type LoginStaffView = {
  staffId: string
  name: string
  branchCode: string
  branchName: string
  status: "active" | "inactive"
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") ?? ""

  const [staffId, setStaffId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [staff, setStaff] = useState<LoginStaffView | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setStaff(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          returnTo: returnTo || undefined,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? "Login failed")
      }

      setStaff(payload.staff)
      router.push(String(payload.redirectTo ?? "/shop/stock-documents"))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  async function onLogout() {
    setLoading(true)
    setError(null)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      setStaff(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-md rounded-lg border border-zinc-200 p-6">
      <h1 className="text-xl font-semibold">Login</h1>
      <p className="mt-2 text-sm text-zinc-600">
        ระบบ Login สำหรับ bootstrap เท่านั้น — ใช้รหัสพนักงานที่มีในระบบแล้ว
        ไม่มีการตรวจรหัสผ่านในเฟสนี้
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm">
          <span className="font-medium">staffId</span>
          <input
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
            placeholder="001"
            autoComplete="username"
          />
        </label>

        <button
          type="submit"
          disabled={loading || !staffId.trim()}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? "กำลัง Login..." : "Login"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {staff ? (
        <div className="mt-6 rounded bg-zinc-50 p-4 text-sm">
          <p className="font-medium">Session</p>
          <dl className="mt-2 space-y-1">
            <div>
              <dt className="inline text-zinc-500">staffId: </dt>
              <dd className="inline">{staff.staffId}</dd>
            </div>
            <div>
              <dt className="inline text-zinc-500">name: </dt>
              <dd className="inline">{staff.name}</dd>
            </div>
            <div>
              <dt className="inline text-zinc-500">branch: </dt>
              <dd className="inline">
                {staff.branchCode} — {staff.branchName}
              </dd>
            </div>
            <div>
              <dt className="inline text-zinc-500">status: </dt>
              <dd className="inline">{staff.status === "active" ? "ใช้งานได้" : "ไม่ใช้งาน"}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onLogout}
        disabled={loading}
        className="mt-4 text-sm text-zinc-600 underline disabled:opacity-50"
      >
        Logout
      </button>
    </div>
  )
}
