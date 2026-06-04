import { NextRequest } from "next/server"
import { GET, POST } from "@/app/api/master/pricing/policy/route"
import { GET as lookupGET } from "@/app/api/master/pricing/policy/lookup/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pricing", () => ({
  listPricingPolicies: jest.fn(),
  createPricingPolicy: jest.fn(),
  getActivePricingPolicy: jest.fn(),
  parseCreatePricingPolicyBody: jest.requireActual("@/lib/pricing/parse-mutations")
    .parseCreatePricingPolicyBody,
  parsePolicyLookupQuery: jest.requireActual("@/lib/pricing/parse-mutations")
    .parsePolicyLookupQuery,
}))

jest.mock("@/lib/shared/prisma", () => ({ prisma: {} }))

import { getSession } from "@/lib/auth/session"
import {
  createPricingPolicy,
  getActivePricingPolicy,
  listPricingPolicies,
} from "@/lib/pricing"

const hoAdmin = {
  sessionId: "s1",
  userId: "u1",
  role: "HO_ADMIN" as const,
  staffId: "001",
  name: "Admin",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "HO",
}

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedList = listPricingPolicies as jest.MockedFunction<
  typeof listPricingPolicies
>
const mockedCreate = createPricingPolicy as jest.MockedFunction<
  typeof createPricingPolicy
>
const mockedLookup = getActivePricingPolicy as jest.MockedFunction<
  typeof getActivePricingPolicy
>

describe("pricing policy API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(hoAdmin)
  })

  it("GET returns policies for HO_ADMIN", async () => {
    mockedList.mockResolvedValue([])
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("GET lookup returns policy", async () => {
    mockedLookup.mockResolvedValue({
      id: "p1",
      marketType: "SERVICES",
      pricingClass: "MATERIAL",
      markupPercent: "0.05",
      roundingMode: "CENT_01",
      threshold: null,
      effectiveFrom: new Date().toISOString(),
      effectiveTo: null,
      createdAt: new Date().toISOString(),
    })
    const res = await lookupGET(
      new NextRequest(
        "http://localhost/api/master/pricing/policy/lookup?marketType=SERVICES&pricingClass=MATERIAL"
      )
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.policy?.id).toBe("p1")
  })

  it("POST rejects SH_STAFF", async () => {
    mockedGetSession.mockResolvedValue({ ...hoAdmin, role: "SH_STAFF" })
    const res = await POST(
      new NextRequest("http://localhost/api/master/pricing/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketType: "SERVICES",
          pricingClass: "MATERIAL",
          markupPercent: 5,
          roundingMode: "CENT_01",
        }),
      })
    )
    expect(res.status).toBe(403)
    expect(mockedCreate).not.toHaveBeenCalled()
  })
})
