"use client"

import { useRef, useState } from "react"
import {
  bangkokTodayYmdClient,
  parseStaffIdFromPosInput,
  parseStaffSlashPassword,
} from "@/lib/pos-ui/pos-staff-credential"
import {
  fetchPosCollectReport,
  verifyPosStaffCredential,
} from "@/lib/pos-ui/read-report-client"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

type PosCollectorOverlayProps = {
  onClose: () => void
  onReport: (report: ReadReportPayload) => void
}

export function PosCollectorOverlay({ onClose, onReport }: PosCollectorOverlayProps) {
  const y = bangkokTodayYmdClient()
  const [staffInput, setStaffInput] = useState("")
  const [resolvedCode, setResolvedCode] = useState<string | null>(null)
  const [gateStep, setGateStep] = useState<"credential" | "range">("credential")
  const [dateFrom, setDateFrom] = useState(y)
  const [dateTo, setDateTo] = useState(y)
  const [loading, setLoading] = useState(false)
  const verifiedPasswordRef = useRef("")
  const dateFromRef = useRef<HTMLInputElement>(null)
  const dateToRef = useRef<HTMLInputElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)

  async function verifyCredential(raw: string) {
    const parsed = parseStaffSlashPassword(raw)
    if (!parsed) {
      alert("ใช้รูปแบบ รหัสพนักงาน/รหัสผ่าน เช่น 001/รหัสผ่าน แล้วกด Enter")
      return
    }
    const r = await verifyPosStaffCredential({
      intent: "COLLECT",
      staffId: parsed.staffCode,
      password: parsed.password,
    })
    if (!r.ok) {
      alert(r.error)
      setResolvedCode(null)
      verifiedPasswordRef.current = ""
      return
    }
    const line = r.staffName ? `${r.staffId} • ${r.staffName}` : `${r.staffId} •`
    setStaffInput(line)
    setResolvedCode(r.staffId)
    verifiedPasswordRef.current = parsed.password
    setGateStep("range")
  }

  async function submitCollect() {
    const raw = staffInput.trim()
    const code = parseStaffIdFromPosInput(raw)
    if (gateStep !== "range" || !raw.includes("•")) {
      alert("กรุณายืนยันรหัสพนักงานและรหัสผ่านก่อน (รูปแบบ 001/รหัสผ่าน แล้วกด Enter)")
      return
    }
    if (!resolvedCode || code !== resolvedCode) {
      alert("ข้อมูลพนักงานไม่ตรงกัน กรุณากรอก รหัส/รหัสผ่าน ใหม่")
      return
    }
    const pw = verifiedPasswordRef.current
    if (!pw) {
      alert("กรุณายืนยันรหัสผ่านอีกครั้ง (รูปแบบ 001/รหัสผ่าน)")
      return
    }

    setLoading(true)
    try {
      const result = await fetchPosCollectReport({
        staffId: code,
        password: pw,
        dateFrom,
        dateTo,
      })
      if (!result.ok) {
        alert(result.error)
        return
      }
      onReport(result.report)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setStaffInput("")
    setResolvedCode(null)
    verifiedPasswordRef.current = ""
    setGateStep("credential")
    onClose()
  }

  return (
    <div className="pos-staff-gate-overlay absolute inset-0 z-[75] flex items-center justify-center bg-black/60 p-3">
      <div className="w-full max-w-md rounded-xl border-2 border-amber-500 bg-white p-4 text-zinc-900 shadow-2xl">
        <p className="text-center text-sm font-bold text-zinc-900">
          COLLECTOR — เก็บยอดจาก Cash Register
        </p>
        <p className="mt-1 text-center text-[11px] text-zinc-600">
          ช่วงวันที่ปฏิทินกรุงเทพ สูงสุด 31 วัน — พิมพ์{" "}
          <span className="font-mono">รหัสพนักงาน/รหัสผ่าน</span> แล้วกด Enter
          เพื่อยืนยัน จากนั้นเลือกวันที่ แล้ว Enter อีกครั้งหรือกดตกลง
        </p>
        <label className="mt-3 block text-xs font-semibold text-zinc-700">
          รหัสพนักงาน / รหัสผ่าน
        </label>
        <input
          type={gateStep === "credential" ? "password" : "text"}
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          name="pos-collect-staff-credential"
          value={staffInput}
          onChange={(e) => {
            const v = e.target.value
            setStaffInput(v)
            if (gateStep === "range") {
              const id = parseStaffIdFromPosInput(v)
              if (!v.includes("•") || id !== resolvedCode) {
                setResolvedCode(null)
                setGateStep("credential")
                verifiedPasswordRef.current = ""
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return
            e.preventDefault()
            const raw = staffInput.trim()
            if (!raw) return
            if (gateStep === "credential") {
              void verifyCredential(raw)
              return
            }
            const id = parseStaffIdFromPosInput(raw)
            if (resolvedCode && resolvedCode === id && raw.includes("•")) {
              void submitCollect()
            }
          }}
          placeholder="เช่น 001/รหัสผ่าน"
          className="mt-1 min-h-[2.75rem] w-full rounded border border-zinc-400 px-3 py-2 text-left text-base font-semibold text-zinc-900"
          autoComplete="off"
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700">จากวันที่</label>
            <input
              ref={dateFromRef}
              type="date"
              disabled={gateStep === "credential"}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              onKeyDown={(e) => {
                if (gateStep !== "range" || e.key !== "Enter") return
                e.preventDefault()
                dateToRef.current?.focus({ preventScroll: true })
              }}
              className="mt-1 w-full rounded border border-zinc-400 px-2 py-2 text-sm text-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700">ถึงวันที่</label>
            <input
              ref={dateToRef}
              type="date"
              disabled={gateStep === "credential"}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              onKeyDown={(e) => {
                if (gateStep !== "range" || e.key !== "Enter") return
                e.preventDefault()
                submitRef.current?.focus({ preventScroll: true })
              }}
              className="mt-1 w-full rounded border border-zinc-400 px-2 py-2 text-sm text-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:opacity-60"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-lg border border-zinc-400 py-2 text-sm font-semibold text-zinc-800"
          >
            ยกเลิก
          </button>
          <button
            ref={submitRef}
            type="button"
            disabled={loading}
            onClick={() => {
              const raw = staffInput.trim()
              if (gateStep === "credential") {
                void verifyCredential(raw)
                return
              }
              void submitCollect()
            }}
            className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "กำลังโหลด…" : gateStep === "credential" ? "ยืนยันรหัส" : "ตกลง"}
          </button>
        </div>
      </div>
    </div>
  )
}
