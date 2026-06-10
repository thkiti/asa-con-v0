import { NextRequest } from "next/server"
import {
  getSession,
  requirePeriodAdminActor,
} from "@/lib/auth"
import { buildImportPreview } from "@/lib/finance/gl-account-import"
import { POST } from "@/app/api/finance/accounts/import/preview/route"

jest.mock("@/lib/auth", () => ({
  ...jest.requireActual("@/lib/auth"),
  getSession: jest.fn(),
  requirePeriodAdminActor: jest.fn(),
}))

jest.mock("@/lib/finance/gl-account-import", () => ({
  buildImportPreview: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockRequire = requirePeriodAdminActor as jest.MockedFunction<
  typeof requirePeriodAdminActor
>
const mockPreview = buildImportPreview as jest.MockedFunction<
  typeof buildImportPreview
>

describe("POST /api/finance/accounts/import/preview", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      sessionId: "s",
      role: "HO_FINANCE",
      staffId: "staff-1",
      name: "F",
      branchId: "b1",
    })
    mockRequire.mockReturnValue({ staffId: "staff-1", role: "HO_FINANCE" })
    mockPreview.mockResolvedValue({
      summary: {
        totalRows: 1,
        insertCount: 1,
        updateCount: 0,
        blockedCount: 0,
        errorCount: 0,
        warningCount: 0,
      },
      inserts: [],
      updates: [],
      blocked: [],
      errors: [],
      warnings: [],
      operationalCodesCheck: [],
    })
  })

  it("returns preview for valid CSV upload", async () => {
    const csv = "accountCode,accountName,accountType,normalBalance\n1100,Cash,ASSET,DEBIT"
    const form = new FormData()
    form.append("file", new File([csv], "coa.csv", { type: "text/csv" }))

    const req = new NextRequest("http://localhost/api/finance/accounts/import/preview", {
      method: "POST",
      body: form,
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockPreview).toHaveBeenCalled()
  })
})
