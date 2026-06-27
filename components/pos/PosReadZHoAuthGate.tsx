"use client"

import { useState } from "react"
import {
  parseStaffSlashPassword,
} from "@/lib/pos-ui/pos-staff-credential"
import { verifyPosStaffCredential } from "@/lib/pos-ui/read-report-client"
import type { ReadZHoReviewAuth } from "@/lib/pos-ui/read-report-client"

type PosReadZHoAuthGateProps = {
  onClose: () => void
  onAuthorized: (auth: ReadZHoReviewAuth) => void
}

export function PosReadZHoAuthGate({
  onClose,
  onAuthorized,
}: PosReadZHoAuthGateProps) {
  const [staffInput, setStaffInput] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit() {
    const parsed = parseStaffSlashPassword(staffInput.trim())
    if (!parsed) {
      alert("ใช้รูปแบบ รหัสพนักงาน/รหัสผ่าน เช่น 001/รหัสผ่าน แล้วกด Enter")
      return
    }

    setLoading(true)
    try {
      const result = await verifyPosStaffCredential({
        intent: "READ_Z_REVIEW",
        staffId: parsed.staffCode,
        password: parsed.password,
      })
      if (!result.ok) {
        alert(result.error)
        return
      }
      onAuthorized({
        staffId: result.staffId,
        password: parsed.password,
        staffName: result.staffName,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="pos-staff-gate-overlay absolute inset-0 z-[80] flex items-center justify-center bg-black/60 p-3"
      data-testid="pos-read-z-ho-auth-gate"
    >
      <div className="w-full max-w-sm rounded-xl border-2 border-orange-400 bg-white p-4 text-zinc-900 shadow-2xl">
        <p className="text-center text-sm font-bold text-zinc-900">
          READ Z — ยืนยันสิทธิ์ HO
        </p>
        <p className="mt-1 text-center text-[11px] text-zinc-600">
          พิมพ์ <span className="font-mono">รหัสพนักงาน/รหัสผ่าน</span> ของ HO
          เพื่อเปิด READ Z Lookup (ดูย้อนหลัง / Cumulative — ดูอย่างเดียว)
        </p>
        <input
          type="password"
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          name="pos-read-z-ho-credential"
          value={staffInput}
          onChange={(e) => setStaffInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || loading) return
            e.preventDefault()
            void submit()
          }}
          placeholder="เช่น 001/รหัสผ่าน"
          className="mt-3 min-h-[2.75rem] w-full rounded border border-zinc-400 px-3 py-2 text-left text-base font-semibold text-zinc-900"
          autoComplete="off"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-400 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void submit()}
            className="flex-1 rounded-lg border border-orange-600 bg-orange-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "กำลังตรวจ…" : "ยืนยัน"}
          </button>
        </div>
      </div>
    </div>
  )
}
