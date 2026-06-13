import {
  assertSafeStaffEvidenceStaffId,
  buildStaffEvidenceBlobPath,
  buildStaffEvidenceCaptureBlobPath,
} from "@/lib/pos/staff-evidence-blob"
import { PosLookupError } from "@/lib/pos/pos-errors"

describe("staff-evidence-blob", () => {
  it("builds canonical blob paths", () => {
    expect(buildStaffEvidenceBlobPath("103", "ph")).toBe("staff-evidence/103-ph.jpg")
    expect(buildStaffEvidenceBlobPath("103", "id")).toBe("staff-evidence/103-id.jpg")
  })

  it("rejects unsafe staff ids", () => {
    expect(() => assertSafeStaffEvidenceStaffId("../103")).toThrow(PosLookupError)
    expect(() => assertSafeStaffEvidenceStaffId("")).toThrow(PosLookupError)
  })

  it("builds capture staging blob paths", () => {
    expect(buildStaffEvidenceCaptureBlobPath("abc123", "ph")).toBe(
      "staff-evidence-capture/abc123-ph.jpg"
    )
  })
})
