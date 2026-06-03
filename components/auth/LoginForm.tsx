"use client"

import { ThemeSelector } from "@/components/theme/ThemeSelector"
import {
  postBranchPreview,
  postCredentialLogin,
  postStaffPreview,
} from "@/lib/auth/login-client"
import type { BranchPreview, StaffPreview } from "@/lib/auth/login-preview"
import {
  themeBtnPrimary,
  themeCard,
  themeInput,
  themeLinkMuted,
  themeMuted,
} from "@/lib/theme/theme-classes"
import { useRouter, useSearchParams } from "next/navigation"
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useRef,
  useState,
} from "react"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") ?? ""

  const staffIdRef = useRef<HTMLInputElement>(null)
  const branchCodeRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const [staffId, setStaffId] = useState("")
  const [branchCode, setBranchCode] = useState("")
  const [password, setPassword] = useState("")
  const [staffPreview, setStaffPreview] = useState<StaffPreview | null>(null)
  const [branchPreview, setBranchPreview] = useState<BranchPreview | null>(null)
  const [branchMatched, setBranchMatched] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit =
    staffPreview !== null &&
    branchPreview !== null &&
    branchMatched &&
    password.length > 0

  const resetAfterStaffChange = useCallback(() => {
    setStaffPreview(null)
    setBranchPreview(null)
    setBranchMatched(false)
    setBranchCode("")
    setPassword("")
  }, [])

  async function runStaffPreview() {
    const raw = staffId.trim()
    if (!raw) {
      setError("กรุณากรอกรหัสพนักงาน")
      setStaffPreview(null)
      return
    }

    setPreviewLoading(true)
    setError(null)

    try {
      const preview = await postStaffPreview({ staffId: raw })
      setStaffPreview(preview)
      setStaffId(preview.staffId)
      setBranchPreview(null)
      setBranchMatched(false)
      setPassword("")
      branchCodeRef.current?.focus()
    } catch (err) {
      setStaffPreview(null)
      setBranchPreview(null)
      setBranchMatched(false)
      setError(
        err instanceof Error ? err.message : "ไม่พบข้อมูล"
      )
      staffIdRef.current?.focus()
    } finally {
      setPreviewLoading(false)
    }
  }

  async function runBranchPreview() {
    if (!staffPreview) {
      setError("กรุณาตรวจสอบรหัสพนักงานก่อน")
      staffIdRef.current?.focus()
      return
    }

    const raw = branchCode.trim()
    if (!raw) {
      setError("กรุณากรอกรหัสสาขา")
      setBranchPreview(null)
      setBranchMatched(false)
      return
    }

    setPreviewLoading(true)
    setError(null)

    try {
      const preview = await postBranchPreview({ branchCode: raw })
      setBranchPreview(preview)
      setBranchCode(preview.branchCode)

      if (preview.branchId !== staffPreview.branchId) {
        setBranchMatched(false)
        setPassword("")
        setError("พนักงานไม่สังกัดสาขานี้")
        branchCodeRef.current?.focus()
        return
      }

      setBranchMatched(true)
      setError(null)
      passwordRef.current?.focus()
    } catch (err) {
      setBranchPreview(null)
      setBranchMatched(false)
      setError(
        err instanceof Error ? err.message : "ไม่พบข้อมูล"
      )
      branchCodeRef.current?.focus()
    } finally {
      setPreviewLoading(false)
    }
  }

  function onStaffIdKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return
    event.preventDefault()
    void runStaffPreview()
  }

  function onBranchCodeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return
    event.preventDefault()
    void runBranchPreview()
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit || !staffPreview || !branchPreview) return

    setLoading(true)
    setError(null)

    try {
      const result = await postCredentialLogin({
        username: staffPreview.staffId,
        password,
        branchCode: branchPreview.branchCode,
        returnTo: returnTo || undefined,
      })

      router.push(result.redirectTo)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง"
      )
      passwordRef.current?.focus()
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

  const busy = loading || previewLoading

  return (
    <div className="mx-auto mt-8 max-w-md">
      <div className="mb-4 flex justify-end">
        <ThemeSelector />
      </div>

      <div className={themeCard} aria-busy={busy}>
        <h1 className="text-xl font-semibold">เข้าสู่ระบบ</h1>
        <p className={`mt-2 text-sm ${themeMuted}`}>
          รหัสพนักงาน → รหัสสาขา → รหัสผ่าน
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm" htmlFor="login-staff-id">
            <span className="font-medium">รหัสพนักงาน</span>
            <input
              ref={staffIdRef}
              id="login-staff-id"
              name="staffId"
              className={themeInput}
              value={staffId}
              onChange={(event) => {
                setStaffId(event.target.value)
                resetAfterStaffChange()
                setError(null)
              }}
              onBlur={() => void runStaffPreview()}
              onKeyDown={onStaffIdKeyDown}
              placeholder="001"
              autoComplete="username"
              disabled={busy}
            />
          </label>

          {staffPreview ? (
            <p
              className={`text-sm ${themeMuted}`}
              aria-live="polite"
              data-testid="staff-preview-line"
            >
              {staffPreview.staffId} • {staffPreview.staffName}
            </p>
          ) : null}

          <label className="block text-sm" htmlFor="login-branch-code">
            <span className="font-medium">รหัสสาขา</span>
            <input
              ref={branchCodeRef}
              id="login-branch-code"
              name="branchCode"
              className={themeInput}
              value={branchCode}
              onChange={(event) => {
                setBranchCode(event.target.value)
                setBranchPreview(null)
                setBranchMatched(false)
                setPassword("")
                setError(null)
              }}
              onBlur={() => void runBranchPreview()}
              onKeyDown={onBranchCodeKeyDown}
              placeholder="HO999"
              autoComplete="off"
              disabled={busy || !staffPreview}
            />
          </label>

          {branchPreview ? (
            <p
              className={`text-sm ${themeMuted}`}
              aria-live="polite"
              data-testid="branch-preview-line"
            >
              {branchPreview.branchCode} • {branchPreview.branchName}
            </p>
          ) : null}

          <label className="block text-sm" htmlFor="login-password">
            <span className="font-medium">รหัสผ่าน</span>
            <input
              ref={passwordRef}
              id="login-password"
              name="password"
              type="password"
              className={themeInput}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={busy || !branchMatched}
            />
          </label>

          <button
            type="submit"
            disabled={busy || !canSubmit}
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
          disabled={busy}
          className={`mt-6 text-sm ${themeLinkMuted}`}
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  )
}
