describe("prisma lazy init", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl
    }
    delete (globalThis as { prisma?: unknown }).prisma
    jest.resetModules()
  })

  it("importing prisma module without DATABASE_URL should NOT throw", () => {
    delete process.env.DATABASE_URL
    expect(() => {
      require("@/lib/shared/prisma")
    }).not.toThrow()
  })

  it("requireDatabaseUrl throws without env", () => {
    delete process.env.DATABASE_URL
    const { requireDatabaseUrl } = require("@/lib/shared/env")
    expect(() => requireDatabaseUrl()).toThrow("DATABASE_URL is not set")
  })

  it("accessing prisma without DATABASE_URL throws on first property access", () => {
    delete process.env.DATABASE_URL
    const { prisma } = require("@/lib/shared/prisma")
    expect(() => {
      void prisma.user
    }).toThrow("DATABASE_URL is not set")
  })
})
