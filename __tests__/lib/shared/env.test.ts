import {
  requireDatabaseUrl,
  requireDirectUrl,
  resolveDirectOrDatabaseUrl,
  resolvePgPoolMax,
  resolvePrismaCliDatasourceUrl,
} from "@/lib/shared/env"

describe("database URL helpers", () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
  })

  it("requireDatabaseUrl throws when unset without leaking secrets", () => {
    delete process.env.DATABASE_URL
    expect(() => requireDatabaseUrl()).toThrow("DATABASE_URL is not set")
  })

  it("requireDirectUrl throws when unset and is not needed by runtime helpers for DB URL", () => {
    delete process.env.DIRECT_URL
    process.env.DATABASE_URL = "postgresql://u:p@host:6543/postgres"
    expect(() => requireDirectUrl()).toThrow("DIRECT_URL is not set")
    expect(requireDatabaseUrl()).toContain("6543")
  })

  it("resolveDirectOrDatabaseUrl prefers DIRECT_URL", () => {
    process.env.DIRECT_URL = "postgresql://u:p@db.example.supabase.co:5432/postgres"
    process.env.DATABASE_URL =
      "postgresql://u:p@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
    expect(resolveDirectOrDatabaseUrl()).toContain("db.example.supabase.co")
    expect(resolveDirectOrDatabaseUrl()).toContain(":5432")
  })

  it("resolveDirectOrDatabaseUrl falls back to DATABASE_URL", () => {
    delete process.env.DIRECT_URL
    process.env.DATABASE_URL =
      "postgresql://u:p@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
    expect(resolveDirectOrDatabaseUrl()).toContain(":6543")
  })

  it("resolvePrismaCliDatasourceUrl prefers DIRECT_URL then DATABASE_URL then placeholder", () => {
    expect(
      resolvePrismaCliDatasourceUrl({
        DIRECT_URL: "postgresql://u:p@db.example.supabase.co:5432/postgres",
        DATABASE_URL: "postgresql://u:p@pooler:6543/postgres",
      })
    ).toContain("db.example.supabase.co")

    expect(
      resolvePrismaCliDatasourceUrl({
        DATABASE_URL: "postgresql://u:p@pooler:6543/postgres",
      })
    ).toContain(":6543")

    expect(resolvePrismaCliDatasourceUrl({})).toBe(
      "postgresql://127.0.0.1:5432/asa_con_v0?schema=public"
    )
  })

  it("resolvePgPoolMax is 1 on Vercel/serverless and small locally", () => {
    expect(resolvePgPoolMax({ VERCEL: "1" })).toBe(1)
    expect(resolvePgPoolMax({ VERCEL_ENV: "production" })).toBe(1)
    expect(resolvePgPoolMax({ AWS_LAMBDA_FUNCTION_NAME: "fn" })).toBe(1)
    expect(resolvePgPoolMax({})).toBe(2)
    expect(resolvePgPoolMax({ PRISMA_POOL_MAX: "3" })).toBe(3)
    expect(resolvePgPoolMax({ PRISMA_POOL_MAX: "99" })).toBe(2)
  })
})
