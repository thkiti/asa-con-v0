import type { GlAccountType, Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"

export type GlAccountListFilter = {
  accountType?: GlAccountType
  isActive?: "true" | "false" | "all"
  search?: string
  includeDeleted?: boolean
  limit?: number
  offset?: number
}

export type GlAccountListRow = {
  id: string
  code: string
  name: string
  accountType: GlAccountType
  parentId: string | null
  parentCode: string | null
  parentName: string | null
  isActive: boolean
  deleted: boolean
  hasJournalLines: boolean
  childCount: number
}

export type GlAccountListResult = {
  accounts: GlAccountListRow[]
  total: number
}

export type GlAccountTreeNode = GlAccountListRow & {
  children: GlAccountTreeNode[]
}

export type GlAccountListPrisma = Pick<PrismaClient, "glAccount">

function buildWhere(filter: GlAccountListFilter): Prisma.GlAccountWhereInput {
  const where: Prisma.GlAccountWhereInput = {}

  if (!filter.includeDeleted) {
    where.deleted = false
  }

  if (filter.accountType) {
    where.accountType = filter.accountType
  }

  if (filter.isActive === "true") {
    where.isActive = true
  } else if (filter.isActive === "false") {
    where.isActive = false
  }

  if (filter.search?.trim()) {
    const q = filter.search.trim()
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ]
  }

  return where
}

type GlAccountDbRow = {
  id: string
  code: string
  name: string
  accountType: GlAccountType
  parentId: string | null
  isActive: boolean
  deleted: boolean
  parent: { code: string; name: string } | null
  _count: { journalEntryLines: number; children: number }
}

function mapRow(row: GlAccountDbRow): GlAccountListRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    accountType: row.accountType,
    parentId: row.parentId,
    parentCode: row.parent?.code ?? null,
    parentName: row.parent?.name ?? null,
    isActive: row.isActive,
    deleted: row.deleted,
    hasJournalLines: row._count.journalEntryLines > 0,
    childCount: row._count.children,
  }
}

const listSelect = {
  id: true,
  code: true,
  name: true,
  accountType: true,
  parentId: true,
  isActive: true,
  deleted: true,
  parent: { select: { code: true, name: true } },
  _count: {
    select: { journalEntryLines: true, children: true },
  },
} as const

export async function listGlAccounts(
  prisma: GlAccountListPrisma,
  filter: GlAccountListFilter = {}
): Promise<GlAccountListResult> {
  const where = buildWhere(filter)
  const limit = filter.limit ?? 50
  const offset = filter.offset ?? 0

  const [rows, total] = await Promise.all([
    prisma.glAccount.findMany({
      where,
      orderBy: { code: "asc" },
      take: limit,
      skip: offset,
      select: listSelect,
    }),
    prisma.glAccount.count({ where }),
  ])

  return {
    accounts: rows.map(mapRow),
    total,
  }
}

export async function listAllGlAccountsForExport(
  prisma: GlAccountListPrisma,
  filter: Omit<GlAccountListFilter, "limit" | "offset"> = {}
): Promise<GlAccountListRow[]> {
  const where = buildWhere(filter)
  const rows = await prisma.glAccount.findMany({
    where,
    orderBy: { code: "asc" },
    select: listSelect,
  })
  return rows.map(mapRow)
}

export function buildGlAccountTree(rows: GlAccountListRow[]): GlAccountTreeNode[] {
  const byId = new Map<string, GlAccountTreeNode>()
  for (const row of rows) {
    byId.set(row.id, { ...row, children: [] })
  }

  const roots: GlAccountTreeNode[] = []
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortNodes = (nodes: GlAccountTreeNode[]) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code))
    for (const n of nodes) {
      sortNodes(n.children)
    }
  }
  sortNodes(roots)
  return roots
}

export async function getGlAccountTree(
  prisma: GlAccountListPrisma,
  filter: Omit<GlAccountListFilter, "limit" | "offset"> = {}
): Promise<GlAccountTreeNode[]> {
  const rows = await listAllGlAccountsForExport(prisma, filter)
  return buildGlAccountTree(rows)
}
