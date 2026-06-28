import { resolveReportSessionLegalEntityCode } from "@/lib/finance/reports/report-session"

jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
}))

import { getSession } from "@/lib/auth"

const mockGetSession = getSession as jest.Mock

describe("resolveReportSessionLegalEntityCode", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns session documentEntityCode when present", async () => {
    mockGetSession.mockResolvedValue({ documentEntityCode: "AD" })
    await expect(resolveReportSessionLegalEntityCode()).resolves.toBe("AD")
  })

  it("throws UNAUTHORIZED when session entity is missing", async () => {
    mockGetSession.mockResolvedValue(null)
    await expect(resolveReportSessionLegalEntityCode()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    })

    mockGetSession.mockResolvedValue({})
    await expect(resolveReportSessionLegalEntityCode()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    })
  })
})
