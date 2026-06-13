import type { StaffEvidenceStatus } from "@/lib/pos/staff-evidence"

async function readJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { error?: string; code?: string }
  if (!res.ok) {
    const message =
      typeof body.error === "string" && body.error.trim()
        ? body.error
        : `Request failed (${res.status})`
    throw new Error(message)
  }
  return body
}

export async function fetchStaffEvidenceStatus(): Promise<StaffEvidenceStatus> {
  const res = await fetch("/api/pos/staff-evidence/status", { cache: "no-store" })
  return readJson<StaffEvidenceStatus>(res)
}

export async function submitStaffEvidenceCapture(input: {
  photo: Blob
  idCard: Blob
}): Promise<StaffEvidenceStatus> {
  const form = new FormData()
  form.append("photo", input.photo, "staff-photo.jpg")
  form.append("idCard", input.idCard, "staff-id.jpg")

  const res = await fetch("/api/pos/staff-evidence/submit", {
    method: "POST",
    body: form,
  })
  return readJson<StaffEvidenceStatus>(res)
}
