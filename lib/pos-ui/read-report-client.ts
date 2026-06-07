import type { ReadReportPayload } from "@/lib/pos/read-report-types"

export type PosVerifyStaffResult =
  | { ok: true; staffId: string; staffName: string }
  | { ok: false; error: string }

export type PosReadReportResult =
  | { ok: true; report: ReadReportPayload }
  | { ok: false; error: string }

export async function verifyPosStaffCredential(opts: {
  staffId: string
  password: string
  intent: "READ" | "COLLECT"
}): Promise<PosVerifyStaffResult> {
  try {
    const res = await fetch("/api/pos/verify-pos-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    })
    const data = (await res.json()) as {
      error?: string
      staffId?: string
      staffName?: string
    }
    if (!res.ok) {
      return { ok: false, error: data.error || "ยืนยันไม่สำเร็จ" }
    }
    return {
      ok: true,
      staffId: String(data.staffId ?? opts.staffId),
      staffName: String(data.staffName ?? ""),
    }
  } catch {
    return { ok: false, error: "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ" }
  }
}

export async function fetchPosReadReport(opts: {
  staffId: string
  password: string
  mode: "X" | "Z"
}): Promise<PosReadReportResult> {
  try {
    const res = await fetch("/api/pos/read-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    })
    const data = (await res.json()) as {
      ok?: boolean
      error?: string
    } & Partial<ReadReportPayload>
    if (!res.ok) {
      return { ok: false, error: data.error || "โหลดรายงานไม่สำเร็จ" }
    }
    const { ok: _ok, error: _err, ...rest } = data
    return { ok: true, report: rest as ReadReportPayload }
  } catch {
    return { ok: false, error: "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ" }
  }
}

export async function fetchPosCollectReport(opts: {
  staffId: string
  password: string
  dateFrom: string
  dateTo: string
}): Promise<PosReadReportResult> {
  try {
    const res = await fetch("/api/pos/collect-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    })
    const data = (await res.json()) as {
      ok?: boolean
      error?: string
    } & Partial<ReadReportPayload>
    if (!res.ok) {
      return { ok: false, error: data.error || "โหลดรายงาน Collect ไม่สำเร็จ" }
    }
    const { ok: _ok, error: _err, ...rest } = data
    return { ok: true, report: rest as ReadReportPayload }
  } catch {
    return { ok: false, error: "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ" }
  }
}
