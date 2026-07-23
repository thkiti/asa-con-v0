/** Client-safe END completeness types (no Prisma / server imports). */
export type EndCompletenessIssue = {
  code: string
  message: string
  blocking: boolean
  productId?: string
}

export type EndCompleteness = {
  ok: boolean
  blockers: EndCompletenessIssue[]
  warnings: EndCompletenessIssue[]
}
