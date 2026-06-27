import type { ReadReportPayload } from "@/lib/pos/read-report-types"

export type PosVerifyStaffResult =
  | { ok: true; staffId: string; staffName: string }
  | { ok: false; error: string }

export type ReadZHoReviewAuth = {
  staffId: string
  password: string
  staffName: string
}

export type PosReadZReviewScope = "daily" | "cumulative-to-date"

export type PosReadReportResult =
  | { ok: true; report: ReadReportPayload }
  | { ok: false; error: string }

export type PosCollectCommitContext = {
  staffId: string
  password: string
  dateFrom: string
  dateTo: string
}

export type PosCollectorDefaultDatesResult =
  | { ok: true; dateFrom: string; dateTo: string }
  | { ok: false; error: string }

export async function verifyPosStaffCredential(opts: {
  staffId: string
  password: string
  intent: "READ" | "COLLECT" | "READ_Z_REVIEW"
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
  persist?: boolean
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

export async function fetchPosReadZReviewReport(opts: {
  staffId?: string
  password?: string
  scope: PosReadZReviewScope
  bangkokDate?: string
}): Promise<PosReadReportResult> {
  try {
    const payload: Record<string, string> = { scope: opts.scope }
    if (opts.bangkokDate) payload.bangkokDate = opts.bangkokDate
    if (opts.staffId) payload.staffId = opts.staffId
    if (opts.password) payload.password = opts.password

    const res = await fetch("/api/pos/read-z-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = (await res.json()) as {
      ok?: boolean
      error?: string
    } & Partial<ReadReportPayload>
    if (!res.ok) {
      return { ok: false, error: data.error || "โหลด READ Z review ไม่สำเร็จ" }
    }
    const { ok: _ok, error: _err, ...rest } = data
    return { ok: true, report: rest as ReadReportPayload }
  } catch {
    return { ok: false, error: "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ" }
  }
}

export type ReadZAvailableDatesResult =
  | { ok: true; dates: string[]; fromYmd: string; toYmd: string }
  | { ok: false; error: string }

export async function fetchReadZAvailableDates(): Promise<ReadZAvailableDatesResult> {
  try {
    const res = await fetch("/api/pos/read-z-available-dates")
    const data = (await res.json()) as {
      ok?: boolean
      error?: string
      dates?: string[]
      fromYmd?: string
      toYmd?: string
    }
    if (!res.ok) {
      return { ok: false, error: data.error || "โหลดรายการวันที่ไม่สำเร็จ" }
    }
    return {
      ok: true,
      dates: Array.isArray(data.dates) ? data.dates.map(String) : [],
      fromYmd: String(data.fromYmd ?? ""),
      toYmd: String(data.toYmd ?? ""),
    }
  } catch {
    return { ok: false, error: "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ" }
  }
}

export async function fetchCollectorDefaultDates(
  branchId: string
): Promise<PosCollectorDefaultDatesResult> {
  try {
    const search = new URLSearchParams({ branchId: branchId.trim() })
    const res = await fetch(`/api/pos/collect-report/default-dates?${search.toString()}`)
    const data = (await res.json().catch(() => ({}))) as {
      error?: string
      dateFrom?: string
      dateTo?: string
    }
    if (!res.ok) {
      return { ok: false, error: data.error ?? "โหลดช่วงวันที่เริ่มต้นไม่สำเร็จ" }
    }
    const dateFrom = String(data.dateFrom ?? "").trim()
    const dateTo = String(data.dateTo ?? "").trim()
    if (!dateFrom || !dateTo) {
      return { ok: false, error: "โหลดช่วงวันที่เริ่มต้นไม่สำเร็จ" }
    }
    return { ok: true, dateFrom, dateTo }
  } catch {
    return { ok: false, error: "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ" }
  }
}
