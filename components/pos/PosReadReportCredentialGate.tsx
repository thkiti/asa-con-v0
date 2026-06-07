"use client"

import { useRef, useState } from "react"
import {
  parseStaffIdFromPosInput,
  parseStaffSlashPassword,
} from "@/lib/pos-ui/pos-staff-credential"
import {
  fetchPosReadReport,
  verifyPosStaffCredential,
} from "@/lib/pos-ui/read-report-client"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

type PosReadReportCredentialGateProps = {
  mode: "X" | "Z"
  onClose: () => void
  onReport: (report: ReadReportPayload) => void
}

export function PosReadReportCredentialGate({
  mode,
  onClose,
  onReport,
}: PosReadReportCredentialGateProps) {
  const [staffInput, setStaffInput] = useState("")
  const [resolvedCode, setResolvedCode] = useState<string | null>(null)
  const [gateStep, setGateStep] = useState<"credential" | "ready">("credential")
  const [loading, setLoading] = useState(false)
  const verifiedPasswordRef = useRef("")

  const title =
    mode === "X" ? "READ X รายงานการขาย" : "READ Z สรุปยอดการขายประจำวัน"

  async function submitReport() {
    const raw = staffInput.trim()
    const code = parseStaffIdFromPosInput(raw)
    if (gateStep !== "ready" || !raw.includes("•")) {
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
      const result = await fetchPosReadReport({
        staffId: code,
        password: pw,
        mode,
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

  async function verifyCredential(raw: string) {
    const parsed = parseStaffSlashPassword(raw)
    if (!parsed) {
      alert("ใช้รูปแบบ รหัสพนักงาน/รหัสผ่าน เช่น 001/รหัสผ่าน แล้วกด Enter")
      return
    }
    const r = await verifyPosStaffCredential({
      intent: "READ",
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
    setGateStep("ready")
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
      <div className="w-full max-w-sm rounded-xl border-2 border-orange-400 bg-white p-4 text-zinc-900 shadow-2xl">
        <p className="text-center text-sm font-bold text-zinc-900">กรอกรหัสพนักงาน</p>
        <p className="mt-1 text-center text-[11px] text-zinc-600">
          {title} — พิมพ์ <span className="font-mono">รหัสพนักงาน/รหัสผ่าน</span> แล้ว Enter
          หรือกดยืนยันรหัส จากนั้น Enter อีกครั้งหรือกดตกลงเพื่อโหลดรายงาน
        </p>
        <input
          type={gateStep === "credential" ? "password" : "text"}
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          name="pos-read-staff-credential"
          value={staffInput}
          onChange={(e) => {
            const v = e.target.value
            setStaffInput(v)
            if (gateStep === "ready") {
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
              void submitReport()
            }
          }}
          placeholder="เช่น 001/รหัสผ่าน"
          className="mt-3 min-h-[2.75rem] w-full rounded border border-zinc-400 px-3 py-2 text-left text-base font-semibold text-zinc-900"
          autoComplete="off"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-lg border border-zinc-400 py-2 text-sm font-semibold text-zinc-800"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              const raw = staffInput.trim()
              if (gateStep === "credential") {
                void verifyCredential(raw)
                return
              }
              void submitReport()
            }}
            className="flex-1 rounded-lg bg-orange-600 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "กำลังโหลด…" : gateStep === "credential" ? "ยืนยันรหัส" : "ตกลง"}
          </button>
        </div>
      </div>
    </div>
  )
}
