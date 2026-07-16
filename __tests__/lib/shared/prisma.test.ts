jest.mock("@/generated/prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(function MockPrismaClient(this: {
    $disconnect: jest.Mock
  }) {
    this.$disconnect = jest.fn().mockResolvedValue(undefined)
  }),
}))

jest.mock("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn().mockImplementation(function MockPrismaPg() {
    return {}
  }),
}))

describe("prisma lazy singleton + pool", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL
  const originalVercel = process.env.VERCEL
  const originalVercelEnv = process.env.VERCEL_ENV

  afterEach(async () => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl
    }
    if (originalVercel === undefined) {
      delete process.env.VERCEL
    } else {
      process.env.VERCEL = originalVercel
    }
    if (originalVercelEnv === undefined) {
      delete process.env.VERCEL_ENV
    } else {
      process.env.VERCEL_ENV = originalVercelEnv
    }
    const g = globalThis as {
      prisma?: { $disconnect?: () => Promise<void> }
      prismaPool?: { end?: () => Promise<void> }
    }
    try {
      await g.prisma?.$disconnect?.()
    } catch {
      /* ignore */
    }
    try {
      await g.prismaPool?.end?.()
    } catch {
      /* ignore */
    }
    delete g.prisma
    delete g.prismaPool
    jest.resetModules()
  })

  it("importing prisma module without DATABASE_URL should NOT throw", () => {
    delete process.env.DATABASE_URL
    expect(() => {
      require("@/lib/shared/prisma")
    }).not.toThrow()
  })

  it("accessing prisma without DATABASE_URL throws on first property access", () => {
    delete process.env.DATABASE_URL
    const { prisma } = require("@/lib/shared/prisma")
    expect(() => {
      void prisma.user
    }).toThrow("DATABASE_URL is not set")
  })

  it("does not require DIRECT_URL for runtime singleton", () => {
    process.env.DATABASE_URL = "postgresql://u:p@127.0.0.1:5432/postgres"
    delete process.env.DIRECT_URL
    process.env.VERCEL = "1"
    const { getPrisma, getPrismaPoolForTests } = require("@/lib/shared/prisma")
    const a = getPrisma()
    const b = getPrisma()
    expect(a).toBe(b)
    const pool = getPrismaPoolForTests()
    expect(pool.options.max).toBe(1)
  })

  it("reuses the same Pool across getPrisma calls (no per-import pool)", () => {
    process.env.DATABASE_URL = "postgresql://u:p@127.0.0.1:5432/postgres"
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
    const mod = require("@/lib/shared/prisma")
    const clientA = mod.getPrisma()
    const clientB = mod.getPrisma()
    expect(clientA).toBe(clientB)
    const poolA = mod.getPrismaPoolForTests()
    const poolB = mod.getPrismaPoolForTests()
    expect(poolA).toBe(poolB)
    expect(poolA.options.max).toBe(2)
  })
})
