import { getSession } from "@/lib/auth/session"

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}))

import { cookies } from "next/headers"
import {
  BRANCH_CODE_COOKIE,
  BRANCH_ID_COOKIE,
  BRANCH_NAME_COOKIE,
  DOCUMENT_ENTITY_CODE_COOKIE,
  ROLE_COOKIE,
  SESSION_COOKIE,
  SESSION_EXPIRES_COOKIE,
  STAFF_ID_COOKIE,
  STAFF_NAME_COOKIE,
  USER_ID_COOKIE,
} from "@/lib/auth/cookies"

const mockedCookies = cookies as jest.MockedFunction<typeof cookies>

function cookieStore(values: Record<string, string>) {
  return {
    get: (name: string) =>
      values[name] != null ? { value: values[name] } : undefined,
  }
}

describe("getSession", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns full SessionUser from valid non-expired cookies", async () => {
    mockedCookies.mockResolvedValue(
      cookieStore({
        [SESSION_COOKIE]: "sess-1",
        [USER_ID_COOKIE]: "uid-1",
        [ROLE_COOKIE]: "HO_FINANCE",
        [STAFF_ID_COOKIE]: "153",
        [STAFF_NAME_COOKIE]: "Finance User",
        [BRANCH_ID_COOKIE]: "branch-1",
        [BRANCH_CODE_COOKIE]: "HO999",
        [BRANCH_NAME_COOKIE]: "Head Office",
        [DOCUMENT_ENTITY_CODE_COOKIE]: "AD",
        [SESSION_EXPIRES_COOKIE]: String(Date.now() + 60_000),
      }) as never
    )

    await expect(getSession()).resolves.toEqual({
      sessionId: "sess-1",
      userId: "uid-1",
      role: "HO_FINANCE",
      staffId: "153",
      name: "Finance User",
      branchId: "branch-1",
      branchCode: "HO999",
      branchName: "Head Office",
      documentEntityCode: "AD",
    })
  })

  it("defaults documentEntityCode to AS when cookie missing", async () => {
    mockedCookies.mockResolvedValue(
      cookieStore({
        [SESSION_COOKIE]: "sess-1",
        [USER_ID_COOKIE]: "uid-1",
        [ROLE_COOKIE]: "SH_STAFF",
        [STAFF_ID_COOKIE]: "002",
        [STAFF_NAME_COOKIE]: "Shop User",
        [BRANCH_ID_COOKIE]: "branch-sh",
        [BRANCH_CODE_COOKIE]: "SH001",
        [BRANCH_NAME_COOKIE]: "Shop 1",
        [SESSION_EXPIRES_COOKIE]: String(Date.now() + 60_000),
      }) as never
    )

    await expect(getSession()).resolves.toMatchObject({
      documentEntityCode: "AS",
    })
  })

  it("returns null without sessionId and role", async () => {
    mockedCookies.mockResolvedValue(cookieStore({}) as never)
    await expect(getSession()).resolves.toBeNull()
  })

  it("returns null for expired session cookies", async () => {
    mockedCookies.mockResolvedValue(
      cookieStore({
        [SESSION_COOKIE]: "sess-1",
        [ROLE_COOKIE]: "SH_STAFF",
        [SESSION_EXPIRES_COOKIE]: String(Date.now() - 1),
      }) as never
    )
    await expect(getSession()).resolves.toBeNull()
  })

  it("returns null for legacy cookies without expiry timestamp", async () => {
    mockedCookies.mockResolvedValue(
      cookieStore({
        [SESSION_COOKIE]: "sess-legacy",
        [ROLE_COOKIE]: "SH_STAFF",
        [STAFF_ID_COOKIE]: "002",
        [STAFF_NAME_COOKIE]: "Legacy",
        [BRANCH_ID_COOKIE]: "branch-sh",
      }) as never
    )

    await expect(getSession()).resolves.toBeNull()
  })
})
