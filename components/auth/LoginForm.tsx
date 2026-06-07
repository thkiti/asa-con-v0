"use client"

import { LoginBranchSelect } from "@/components/auth/LoginBranchSelect"
import { LoginPreviewInput } from "@/components/auth/LoginPreviewInput"
import { ThemeSelector } from "@/components/theme/ThemeSelector"
import { isLoginBranchAllowed } from "@/lib/auth/login-branch-match"
import {
  type LoginBranchOption,
  resolveLoginBranchOptions,
  shouldLoadShopBranches,
} from "@/lib/auth/login-branch-options"
import {
  fetchLoginBranches,
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
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

type LoginFocusTarget = "staff" | "branch" | "password"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") ?? ""

  const staffIdRef = useRef<HTMLInputElement>(null)
  const branchCodeRef = useRef<HTMLSelectElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const staffEnterCommitRef = useRef(false)

  const [staffId, setStaffId] = useState("")
  const [branchCode, setBranchCode] = useState("")
  const [password, setPassword] = useState("")
  const [shopBranches, setShopBranches] = useState<LoginBranchOption[]>([])
  const [staffPreview, setStaffPreview] = useState<StaffPreview | null>(null)
  const [branchPreview, setBranchPreview] = useState<BranchPreview | null>(null)
  const [branchMatched, setBranchMatched] = useState(false)
  const [staffFocused, setStaffFocused] = useState(false)
  const [staffFieldError, setStaffFieldError] = useState<string | null>(null)
  const [branchFieldError, setBranchFieldError] = useState<string | null>(null)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pendingFocus, setPendingFocus] = useState<LoginFocusTarget | null>(
    null
  )

  const branchOptions = useMemo(
    () => resolveLoginBranchOptions(staffPreview, shopBranches),
    [staffPreview, shopBranches]
  )

  const focusStaffInput = useCallback((selectAll = true) => {
    const el = staffIdRef.current
    if (!el || el.disabled) return
    el.focus({ preventScroll: true })
    if (selectAll && el.value.length > 0) {
      el.select()
    }
  }, [])

  useEffect(() => {
    setPendingFocus("staff")
  }, [])

  useLayoutEffect(() => {
    if (previewLoading || loading) return
    if (!pendingFocus) return

    const targetRef =
      pendingFocus === "staff"
        ? staffIdRef
        : pendingFocus === "branch"
          ? branchCodeRef
          : passwordRef

    const el = targetRef.current
    if (el && !el.disabled) {
      el.focus({ preventScroll: true })
      if (
        pendingFocus === "staff" &&
        el instanceof HTMLInputElement &&
        el.value.length > 0
      ) {
        el.select()
      }
      setPendingFocus(null)
    }
  }, [
    pendingFocus,
    staffPreview,
    branchPreview,
    branchMatched,
    loading,
    previewLoading,
  ])

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
    setShopBranches([])
    setStaffFieldError(null)
    setBranchFieldError(null)
  }, [])

  const clearStaffFieldForRetry = useCallback(() => {
    setStaffFieldError(null)
    setStaffId("")
    setStaffPreview(null)
    setBranchPreview(null)
    setBranchMatched(false)
    setBranchCode("")
    setPassword("")
    setShopBranches([])
    setBranchFieldError(null)
  }, [])

  const clearBranchFieldForRetry = useCallback(() => {
    setBranchFieldError(null)
    setBranchCode("")
    setBranchPreview(null)
    setBranchMatched(false)
    setPassword("")
  }, [])

  const clearPasswordFieldForRetry = useCallback(() => {
    setLoginError(null)
    setPassword("")
  }, [])

  async function runStaffPreview(options?: { focusNext?: boolean }) {
    const raw = staffId.trim()
    if (!raw) {
      setStaffFieldError("กรุณากรอกรหัสพนักงาน")
      setStaffPreview(null)
      if (options?.focusNext) {
        setPendingFocus("staff")
      }
      return
    }

    setPreviewLoading(true)
    setStaffFieldError(null)

    try {
      const preview = await postStaffPreview({ staffId: raw })
      setStaffPreview(preview)
      setStaffId(preview.staffId)
      setBranchPreview(null)
      setBranchMatched(false)
      setBranchCode("")
      setPassword("")
      setBranchFieldError(null)

      if (shouldLoadShopBranches(preview)) {
        const branches = await fetchLoginBranches()
        setShopBranches(branches)
        if (options?.focusNext) {
          setPendingFocus("branch")
        }
      } else {
        setShopBranches([])
        await runBranchPreview({
          branchCode: preview.branchCode,
          focusNext: options?.focusNext,
          staffPreview: preview,
        })
      }
    } catch (err) {
      setStaffPreview(null)
      setBranchPreview(null)
      setBranchMatched(false)
      setShopBranches([])
      setStaffFieldError(
        err instanceof Error ? err.message : "ไม่พบข้อมูล"
      )
      setPendingFocus("staff")
    } finally {
      setPreviewLoading(false)
    }
  }

  async function runBranchPreview(options?: {
    focusNext?: boolean
    branchCode?: string
    staffPreview?: StaffPreview
  }) {
    const activeStaff = options?.staffPreview ?? staffPreview
    if (!activeStaff) {
      setStaffFieldError("กรุณาตรวจสอบรหัสพนักงานก่อน")
      setPendingFocus("staff")
      return
    }

    const raw = (options?.branchCode ?? branchCode).trim()
    if (!raw) {
      setBranchFieldError("กรุณาเลือกสาขา")
      setBranchPreview(null)
      setBranchMatched(false)
      if (options?.focusNext) {
        setPendingFocus("branch")
      }
      return
    }

    setPreviewLoading(true)
    setBranchFieldError(null)

    try {
      const preview = await postBranchPreview({ branchCode: raw })
      setBranchPreview(preview)
      setBranchCode(preview.branchCode)

      if (!isLoginBranchAllowed(activeStaff, preview)) {
        setBranchMatched(false)
        setPassword("")
        setBranchFieldError("พนักงานไม่สังกัดสาขานี้")
        setPendingFocus("branch")
        return
      }

      setBranchMatched(true)
      setBranchFieldError(null)
      if (options?.focusNext) {
        setPendingFocus("password")
      }
    } catch (err) {
      setBranchPreview(null)
      setBranchMatched(false)
      setBranchFieldError(
        err instanceof Error ? err.message : "ไม่พบข้อมูล"
      )
      setPendingFocus("branch")
    } finally {
      setPreviewLoading(false)
    }
  }

  function onStaffIdKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return
    event.preventDefault()
    staffEnterCommitRef.current = true
    setStaffFocused(false)

    if (staffFieldError) {
      clearStaffFieldForRetry()
      setPendingFocus("staff")
      return
    }

    void runStaffPreview({ focusNext: true })
  }

  function onBranchCodeKeyDown(event: KeyboardEvent<HTMLSelectElement>) {
    if (event.key !== "Enter") return
    event.preventDefault()

    if (branchFieldError) {
      clearBranchFieldForRetry()
      setPendingFocus("branch")
      return
    }

    void runBranchPreview({ focusNext: true })
  }

  function onPasswordKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return
    event.preventDefault()

    if (loginError) {
      clearPasswordFieldForRetry()
      setPendingFocus("password")
      return
    }

    if (!canSubmit || loading) return
    event.currentTarget.form?.requestSubmit()
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit || !staffPreview || !branchPreview) return

    setLoading(true)
    setLoginError(null)

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
      setLoginError(
        err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง"
      )
      setPendingFocus("password")
    } finally {
      setLoading(false)
    }
  }

  async function onLogout() {
    setLoading(true)
    setLoginError(null)
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" })
      let redirectTo = "/login"
      if (res.ok) {
        const body = (await res.json()) as { redirectTo?: string }
        if (body.redirectTo) redirectTo = body.redirectTo
      }
      clearStaffFieldForRetry()
      setPendingFocus("staff")
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Logout ไม่สำเร็จ")
      setPendingFocus("staff")
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
          <LoginPreviewInput
            id="login-staff-id"
            name="staffId"
            label="รหัสพนักงาน"
            inputRef={staffIdRef}
            rawValue={staffId}
            focused={staffFocused}
            onFocus={() => {
              if (!staffFieldError) {
                setStaffFocused(true)
                focusStaffInput(true)
              }
            }}
            onBlur={() => {
              setStaffFocused(false)
              if (staffEnterCommitRef.current) {
                staffEnterCommitRef.current = false
                return
              }
              void runStaffPreview()
            }}
            onChange={(value) => {
              setStaffId(value)
              if (staffFieldError) {
                setStaffFieldError(null)
                setStaffFocused(true)
              }
              resetAfterStaffChange()
            }}
            onKeyDown={onStaffIdKeyDown}
            autoComplete="username"
            disabled={loading}
            successLabel={
              staffPreview && !staffFieldError ? staffPreview.staffName : undefined
            }
            errorLabel={staffFieldError ?? undefined}
          />

          <LoginBranchSelect
            id="login-branch-code"
            name="branchCode"
            label="รหัสสาขา"
            selectRef={branchCodeRef}
            value={branchCode}
            ready={staffPreview !== null}
            options={branchOptions}
            disabled={loading}
            onChange={(code) => {
              setBranchCode(code)
              setBranchPreview(null)
              setBranchMatched(false)
              setPassword("")
              if (branchFieldError) {
                setBranchFieldError(null)
              }
              if (code) {
                void runBranchPreview({ branchCode: code })
              }
            }}
            onKeyDown={onBranchCodeKeyDown}
            successLabel={
              branchPreview && branchMatched && !branchFieldError
                ? branchPreview.branchName
                : undefined
            }
            errorLabel={branchFieldError ?? undefined}
          />

          <label className="block text-sm" htmlFor="login-password">
            <span className="font-medium">รหัสผ่าน</span>
            <div className="relative">
              <input
                ref={passwordRef}
                id="login-password"
                name="password"
                type="password"
                className={[
                  themeInput,
                  "pr-10",
                  loginError
                    ? "border-red-600 focus-visible:border-red-600 focus-visible:ring-1 focus-visible:ring-red-600"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setLoginError(null)
                }}
                onKeyDown={onPasswordKeyDown}
                autoComplete="current-password"
                disabled={loading || !branchMatched}
                aria-invalid={loginError ? true : undefined}
                aria-describedby={loginError ? "login-password-error" : undefined}
              />
              {loginError ? (
                <>
                  <span
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-red-600"
                    aria-hidden
                  >
                    ✕
                  </span>
                  <span id="login-password-error" className="sr-only" role="alert">
                    {loginError}
                  </span>
                </>
              ) : null}
            </div>
            {loginError ? (
              <p
                className="sr-only"
                role="alert"
                data-testid="login-error-message"
              >
                {loginError}
              </p>
            ) : null}
          </label>

          <button
            type="submit"
            disabled={busy || !canSubmit}
            className={themeBtnPrimary}
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

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
