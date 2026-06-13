import {
  fetchMasterStaffEvidenceMobileLink,
  fetchMasterStaffEvidenceMobileStatus,
} from "@/lib/master-ui/staff-evidence-mobile-client"

describe("master staff evidence mobile client", () => {
  it("posts mobile-link for staff row id", async () => {
    const fetchFn = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        uploadUrl: "http://shop/staff-evidence/mobile/tok",
        token: "tok",
        expiresAt: "2099-01-01T00:00:00.000Z",
        kind: "ph",
        staffId: "103",
      }),
    })) as unknown as typeof fetch

    const result = await fetchMasterStaffEvidenceMobileLink("row-abc", { kind: "ph" }, fetchFn)

    expect(result.ok).toBe(true)
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/master/staff/row-abc/evidence/mobile-link",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("polls mobile-status for staff row id", async () => {
    const fetchFn = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        ready: true,
        blobUrl: "https://blob.example/capture.jpg",
        kind: "id",
        staffId: "103",
      }),
    })) as unknown as typeof fetch

    const result = await fetchMasterStaffEvidenceMobileStatus("row-abc", "signed.token", fetchFn)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.ready).toBe(true)
      expect(result.blobUrl).toContain("capture.jpg")
    }
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/master/staff/row-abc/evidence/mobile-status?token=signed.token",
      expect.any(Object)
    )
  })
})
