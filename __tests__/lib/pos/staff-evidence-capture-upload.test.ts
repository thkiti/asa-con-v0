jest.mock("@vercel/blob", () => ({
  list: jest.fn(),
  put: jest.fn(),
}))

jest.mock("@/lib/catalog-image/vercel-blob", () => ({
  getBlobAuthConfig: jest.fn(() => ({ mode: "token", token: "test-token" })),
}))

import { list } from "@vercel/blob"
import { findStaffEvidenceCaptureBlob } from "@/lib/pos/staff-evidence-capture-upload"

const listMock = list as jest.Mock

describe("findStaffEvidenceCaptureBlob", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("lists blobs by pathname prefix without .jpg extension", async () => {
    listMock.mockResolvedValue({
      blobs: [
        {
          pathname: "staff-evidence-capture/cap-ph.jpg",
          url: "https://blob.example/staff-evidence-capture/cap-ph.jpg",
        },
      ],
    })

    const blob = await findStaffEvidenceCaptureBlob({
      captureId: "cap",
      staffId: "103",
      kind: "ph",
      exp: Date.now() + 60_000,
    })

    expect(listMock).toHaveBeenCalledWith({
      prefix: "staff-evidence-capture/cap-ph",
      token: "test-token",
    })
    expect(blob).toEqual({
      pathname: "staff-evidence-capture/cap-ph.jpg",
      url: "https://blob.example/staff-evidence-capture/cap-ph.jpg",
    })
  })

  it("returns null when capture blob is missing", async () => {
    listMock.mockResolvedValue({ blobs: [] })

    const blob = await findStaffEvidenceCaptureBlob({
      captureId: "cap",
      staffId: "103",
      kind: "id",
      exp: Date.now() + 60_000,
    })

    expect(blob).toBeNull()
  })
})
