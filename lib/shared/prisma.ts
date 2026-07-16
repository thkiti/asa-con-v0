import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { PrismaClient } from "@/generated/prisma/client"
import { requireDatabaseUrl, resolvePgPoolMax } from "./env"

type PrismaGlobal = {
  prisma: PrismaClient | undefined
  prismaPool: Pool | undefined
}

const globalForPrisma = globalThis as unknown as PrismaGlobal

function createPrismaPool(): Pool {
  return new Pool({
    connectionString: requireDatabaseUrl(),
    max: resolvePgPoolMax(),
  })
}

function getPrismaPool(): Pool {
  if (globalForPrisma.prismaPool) {
    return globalForPrisma.prismaPool
  }
  const pool = createPrismaPool()
  globalForPrisma.prismaPool = pool
  return pool
}

function createPrisma(): PrismaClient {
  const pool = getPrismaPool()
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }
  const client = createPrisma()
  globalForPrisma.prisma = client
  return client
}

export function getPrisma(): PrismaClient {
  return getPrismaClient()
}

/** Test/ops helper — same singleton Pool used by PrismaClient. */
export function getPrismaPoolForTests(): Pool {
  return getPrismaPool()
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (prop === "then") return undefined
    const client = getPrismaClient()
    const value = Reflect.get(client, prop, receiver)
    if (typeof value === "function") {
      return value.bind(client)
    }
    return value
  },
})
