"use client"

import { useRef, useState } from "react"
import {
  parseStaffSlashPassword,
} from "@/lib/pos-ui/pos-staff-credential"
import {
  fetchPosReadReport,
  verifyPosStaffCredential,
} from "@/lib/pos-ui/read-report-client"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

const STAFF_CONFIRM_DELAY_MS = 400

type PosReadReportCredentialGateProps = {
  mode: "X" | "Z"
  onClose: () => void
  onReport: (report: ReadReportPayload) => void
}

type GateStep = "credential" | "opening"

export function PosReadReportCredentialGate({
  mode,
  onClose,
  onReport,
}: PosReadReportCredentialGateProps) {
  const [staffInput, setStaffInput] = useState("")
  const [gateStep, setGateStep] = useState<GateStep>("credential")
  const [loading, setLoading] = useState(false)
  const openingRef = useRef(false)

  const title =
    mode === "X" ? "READ X รายงานการขาย" : "READ Z สรุปยอดการขายประจำวัน"

  async function verifyAndOpen(raw: string) {
    if (openingRef.current) return

    const parsed = parseStaffSlashPassword(raw)
    if (!parsed) {
      alert("ใช้รูปแบบ รหัสพนักงาน/รหัสผ่าน เช่น 001/รหัสผ่าน แล้วกด Enter")
      return
    }

    openingRef.current = true
    setLoading(true)
    try {
      const auth = await verifyPosStaffCredential({
        intent: "READ",
        staffId: parsed.staffCode,
        password: parsed.password,
      })
      if (!auth.ok) {
        alert(auth.error)
        return
      }

      const displayLine = auth.staffName
        ? `${auth.staffId} • ${auth.staffName}`
        : auth.staffId
      setGateStep("opening")
      setStaffInput(displayLine)

      await new Promise((resolve) => setTimeout(resolve, STAFF_CONFIRM_DELAY_MS))

      const result = await fetchPosReadReport({
        staffId: auth.staffId,
        password: parsed.password,
        mode,
      })
      if (!result.ok) {
        alert(result.error)
        setGateStep("credential")
        setStaffInput("")
        return
      }
      onReport(result.report)
    } finally {
      openingRef.current = false
      setLoading(false)
    }
  }

  function handleClose() {
    setStaffInput("")
    setGateStep("credential")
    onClose()
  }

  return (
    <div className="pos-staff-gate-overlay absolute inset-0 z-[75] flex items-center justify-center bg-black/60 p-3">
      <div className="w-full max-w-sm rounded-xl border-2 border-orange-400 bg-white p-4 text-zinc-900 shadow-2xl">
        <p className="text-center text-sm font-bold text-zinc-900">กรอกรหัสพนักงาน</p>
        <p className="mt-1 text-center text-[11px] text-zinc-600">
          {title} — พิมพ์ <span className="font-mono">รหัสพนักงาน/รหัสผ่าน</span> แล้วกด Enter
          {gateStep === "opening" ? " · กำลังเปิดรายงาน…" : ""}
        </p>
        <input
          type={gateStep === "credential" ? "password" : "text"}
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          name="pos-read-staff-credential"
          value={staffInput}
          readOnly={gateStep === "opening"}
          onChange={(e) => {
            if (gateStep === "opening") return
            setStaffInput(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || loading) return
            e.preventDefault()
            const raw = staffInput.trim()
            if (!raw) return
            void verifyAndOpen(raw)
          }}
          placeholder="เช่น 001/รหัสผ่าน"
          className="mt-3 min-h-[2.75rem] w-full rounded border border-zinc-400 px-3 py-2 text-left text-base font-semibold text-zinc-900"
          autoComplete="off"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={handleClose}
            className="flex-1 rounded-lg border border-zinc-400 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-50"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  )
}
