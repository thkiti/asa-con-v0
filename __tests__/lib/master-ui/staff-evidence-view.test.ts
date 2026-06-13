import {
  staffEvidenceCacheBustUrl,
  staffEvidenceUpdatedAtForKind,
} from "@/lib/master-ui/staff-evidence-view"

describe("staff-evidence-view cache bust", () => {
  it("appends v query from photoUpdatedAt", () => {
    const url = staffEvidenceCacheBustUrl(
      "https://blob.example/staff-evidence/103-ph.jpg",
      "2026-06-13T10:00:00.000Z"
    )
    expect(url).toContain("103-ph.jpg")
    expect(url).toMatch(/[?&]v=/)
  })

  it("combines updatedAt with client nonce", () => {
    const url = staffEvidenceCacheBustUrl(
      "https://blob.example/staff-evidence/103-id.jpg",
      "2026-06-13T10:00:00.000Z",
      2
    )
    expect(url).toMatch(/v=\d+-2$/)
  })

  it("returns null for empty url", () => {
    expect(staffEvidenceCacheBustUrl(null, null)).toBeNull()
  })

  it("picks kind-specific updatedAt", () => {
    const detail = {
      photoUpdatedAt: "2026-06-13T10:00:00.000Z",
      idCardUpdatedAt: "2026-06-13T11:00:00.000Z",
    }
    expect(staffEvidenceUpdatedAtForKind(detail, "ph")).toBe(detail.photoUpdatedAt)
    expect(staffEvidenceUpdatedAtForKind(detail, "id")).toBe(detail.idCardUpdatedAt)
  })
})
