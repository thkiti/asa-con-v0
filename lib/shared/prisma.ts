import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/generated/prisma/client"
import { requireDatabaseUrl } from "./env"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrisma(): PrismaClient {
  const connectionString = requireDatabaseUrl()
  const adapter = new PrismaPg({ connectionString })
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
