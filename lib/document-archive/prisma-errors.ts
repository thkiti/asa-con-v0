import { Prisma } from "@/generated/prisma/client"

/** Prisma P2021 — queried table does not exist (migration not applied). */
export function isPrismaTableMissingError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2021"
  }
  if (error instanceof Error) {
    return /does not exist/i.test(error.message) && /table/i.test(error.message)
  }
  return false
}
