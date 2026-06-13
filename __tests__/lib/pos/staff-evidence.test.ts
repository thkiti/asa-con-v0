import { getStaffEvidenceStatus, submitStaffEvidence, deleteStaffEvidence, resolveStaffEvidencePresenceForStaffIds } from "@/lib/pos/staff-evidence"
import { PosLookupError } from "@/lib/pos/pos-errors"

jest.mock("@vercel/blob", () => ({
  list: jest.fn(),
}))

jest.mock("@/lib/catalog-image/vercel-blob", () => ({
  getBlobAuthConfig: jest.fn(() => ({ mode: "token", token: "test-token" })),
}))

jest.mock("@/lib/pos/staff-evidence-blob-upload", () => ({
  uploadStaffEvidenceToBlob: jest.fn(async ({ staffId, kind }: { staffId: string; kind: string }) => ({
    blobPathname: `staff-evidence/${staffId}-${kind}.jpg`,
    blobUrl: `https://blob.example/staff-evidence/${staffId}-${kind}.jpg`,
  })),
}))

jest.mock("@/lib/pos/staff-evidence-blob-delete", () => ({
  deleteStaffEvidenceBlobUrl: jest.fn(async () => undefined),
}))

import { list } from "@vercel/blob"
import { uploadStaffEvidenceToBlob } from "@/lib/pos/staff-evidence-blob-upload"
import { deleteStaffEvidenceBlobUrl } from "@/lib/pos/staff-evidence-blob-delete"

const listMock = list as jest.Mock
const uploadMock = uploadStaffEvidenceToBlob as jest.Mock
const deleteMock = deleteStaffEvidenceBlobUrl as jest.Mock

function mockDb(overrides: Record<string, unknown> = {}) {
  return {
    staff: {
      findUnique: jest.fn(async () => ({
        staffId: "103",
        deleted: false,
        ...overrides,
      })),
      update: jest.fn(async () => ({})),
    },
  }
}

describe("getStaffEvidenceStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("reports complete when both blob files exist", async () => {
    listMock.mockImplementation(async ({ prefix }: { prefix: string }) => ({
      blobs:
        prefix === "staff-evidence/103-ph"
          ? [{ pathname: "staff-evidence/103-ph.jpg", url: "https://blob/103-ph.jpg" }]
          : prefix === "staff-evidence/103-id"
            ? [{ pathname: "staff-evidence/103-id.jpg", url: "https://blob/103-id.jpg" }]
            : [],
    }))

    const status = await getStaffEvidenceStatus(mockDb() as never, "103")
    expect(status.evidenceComplete).toBe(true)
    expect(status.photoUploaded).toBe(true)
    expect(status.idCardUploaded).toBe(true)
    expect(status).not.toHaveProperty("staffPhotoUploadedAt")
  })

  it("reports incomplete when either blob is missing", async () => {
    listMock.mockResolvedValue({ blobs: [] })
    const status = await getStaffEvidenceStatus(mockDb() as never, "103")
    expect(status.evidenceComplete).toBe(false)
  })
})

describe("submitStaffEvidence", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    listMock.mockResolvedValue({ blobs: [] })
  })

  it("uploads both files without writing Staff timestamp fields", async () => {
    const db = mockDb()
    const status = await submitStaffEvidence(db as never, {
      staffId: "103",
      photoBuffer: Buffer.from("photo"),
      idCardBuffer: Buffer.from("id"),
    })

    expect(uploadMock).toHaveBeenCalledTimes(2)
    expect(db.staff.update).not.toHaveBeenCalled()
    expect(status.staffId).toBe("103")
    expect(status.evidenceComplete).toBe(false)
  })

  it("rejects when evidence is already complete", async () => {
    listMock.mockImplementation(async ({ prefix }: { prefix: string }) => ({
      blobs:
        prefix === "staff-evidence/103-ph"
          ? [{ pathname: "staff-evidence/103-ph.jpg", url: "https://blob/103-ph.jpg" }]
          : prefix === "staff-evidence/103-id"
            ? [{ pathname: "staff-evidence/103-id.jpg", url: "https://blob/103-id.jpg" }]
            : [],
    }))

    await expect(
      submitStaffEvidence(mockDb() as never, {
        staffId: "103",
        photoBuffer: Buffer.from("photo"),
        idCardBuffer: Buffer.from("id"),
      })
    ).rejects.toMatchObject({
      code: "STAFF_EVIDENCE_ALREADY_COMPLETE",
    })
  })
})

describe("resolveStaffEvidencePresenceForStaffIds", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("maps photo and id flags from blob list prefix", async () => {
    listMock.mockResolvedValue({
      blobs: [
        { pathname: "staff-evidence/103-ph.jpg", url: "https://blob/103-ph.jpg" },
        { pathname: "staff-evidence/104-id.jpg", url: "https://blob/104-id.jpg" },
      ],
    })

    const map = await resolveStaffEvidencePresenceForStaffIds(["103", "104", "105"])
    expect(map.get("103")).toEqual({ photoUploaded: true, idCardUploaded: false })
    expect(map.get("104")).toEqual({ photoUploaded: false, idCardUploaded: true })
    expect(map.get("105")).toEqual({ photoUploaded: false, idCardUploaded: false })
  })
})

describe("deleteStaffEvidence", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("deletes both blob urls and returns incomplete status", async () => {
    let activeBlobs = [
      { pathname: "staff-evidence/103-ph.jpg", url: "https://blob/103-ph.jpg" },
      { pathname: "staff-evidence/103-id.jpg", url: "https://blob/103-id.jpg" },
    ]
    deleteMock.mockImplementation(async (url: string) => {
      activeBlobs = activeBlobs.filter((blob) => blob.url !== url)
    })
    listMock.mockImplementation(async ({ prefix }: { prefix: string }) => {
      if (prefix === "staff-evidence") {
        return { blobs: activeBlobs }
      }
      const pathname = `${prefix}.jpg`
      return { blobs: activeBlobs.filter((blob) => blob.pathname === pathname) }
    })

    const db = mockDb()
    const status = await deleteStaffEvidence(db as never, "103")

    expect(deleteMock).toHaveBeenCalledTimes(2)
    expect(deleteMock).toHaveBeenCalledWith("https://blob/103-ph.jpg")
    expect(deleteMock).toHaveBeenCalledWith("https://blob/103-id.jpg")
    expect(db.staff.update).not.toHaveBeenCalled()
    expect(status.evidenceComplete).toBe(false)
    expect(status.photoUploaded).toBe(false)
    expect(status.idCardUploaded).toBe(false)
  })
})
