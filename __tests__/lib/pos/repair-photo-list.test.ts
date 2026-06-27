jest.mock("@vercel/blob", () => ({
  list: jest.fn(),
}))

jest.mock("@/lib/catalog-image/vercel-blob", () => ({
  getBlobAuthConfig: jest.fn(),
}))

import { list } from "@vercel/blob"
import { listRepairPhotos } from "@/lib/pos/repair-photo-list"

const mockedList = list as jest.MockedFunction<typeof list>

describe("listRepairPhotos", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedList.mockResolvedValue({
      blobs: [
        {
          url: "https://blob.example/repair/REP-SH001-202606-0004-01.jpg",
          pathname: "repair/REP-SH001-202606-0004-01.jpg",
          downloadUrl: "https://blob.example/repair/REP-SH001-202606-0004-01.jpg?download=1",
          contentType: "image/jpeg",
          contentDisposition: "inline",
        },
        {
          url: "https://blob.example/repair/REP-OTHER-202606-0001-01.jpg",
          pathname: "repair/REP-OTHER-202606-0001-01.jpg",
          downloadUrl: "https://blob.example/repair/REP-OTHER-202606-0001-01.jpg?download=1",
          contentType: "image/jpeg",
          contentDisposition: "inline",
        },
      ],
      cursor: undefined,
      hasMore: false,
    })
  })

  it("returns fileName, blobPath, and public url from blob list", async () => {
    const photos = await listRepairPhotos("SH001")
    expect(photos).toEqual([
      {
        fileName: "REP-SH001-202606-0004-01.jpg",
        blobPath: "repair/REP-SH001-202606-0004-01.jpg",
        url: "https://blob.example/repair/REP-SH001-202606-0004-01.jpg",
      },
    ])
    expect(mockedList).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: "repair/" })
    )
  })
})
