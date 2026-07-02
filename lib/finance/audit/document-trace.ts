import { Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import { buildPostedVoucherInquiryPath } from "@/lib/finance/inquiry/finance-document-inquiry-links"
import { buildPosOriginShopPath } from "@/lib/finance/inquiry/pos-origin-shop-path"
import { toMoney, ZERO } from "@/lib/finance/decimal"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { buildFinanceJournalInquiryPath } from "@/lib/finance-ui/finance-navigation"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { buildStockDocumentInquiryPath } from "@/lib/stock/inquiry/stock-document-inquiry-links"

export type TraceNode = {
  id: string
  type: string
  label: string
  documentNo: string
  status: string
  date: string | null
  description: string | null
  href?: string
  meta?: Record<string, string | number | boolean | null>
}

export type TraceEdge = {
  from: string
  to: string
  label: string
  reason: string
}

export type TraceResult = {
  root: string | null
  nodes: TraceNode[]
  edges: TraceEdge[]
  warnings: string[]
}

export type DocumentTraceInput = {
  query: string
  legalEntityCode: string
}

export type DocumentTraceQueryKind =
  | "receipt"
  | "voucher"
  | "stock"
  | "unknown"

export type DocumentTracePrisma = Pick<
  PrismaClient,
  "receipt" | "voucher" | "stockDocument"
>

type TraceBuilder = {
  nodes: TraceNode[]
  edges: TraceEdge[]
  warnings: string[]
  nodeIds: Set<string>
}

const STOCK_DOC_PREFIXES = ["CNT", "ADJ", "ORD", "DEY", "ORS", "ORI"] as const
const VOUCHER_ENTRY_PREFIXES = ["MJV", "PAV", "REV", "PCV", "PAY", "OPB"] as const

function createBuilder(): TraceBuilder {
  return { nodes: [], edges: [], warnings: [], nodeIds: new Set() }
}

function nodeKey(type: string, id: string): string {
  return `${type}:${id}`
}

function addNode(builder: TraceBuilder, node: TraceNode): void {
  if (builder.nodeIds.has(node.id)) return
  builder.nodeIds.add(node.id)
  builder.nodes.push(node)
}

function addEdge(builder: TraceBuilder, edge: TraceEdge): void {
  builder.edges.push(edge)
}

function addWarning(builder: TraceBuilder, message: string): void {
  builder.warnings.push(message)
}

function formatIsoDate(value: Date | string | null | undefined): string | null {
  if (value == null) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function detectDocumentTraceQueryKind(query: string): DocumentTraceQueryKind {
  const normalized = query.trim().toUpperCase()
  if (!normalized) return "unknown"

  if (normalized.startsWith("REC-") || normalized.startsWith("REC")) {
    return "receipt"
  }

  if (normalized.startsWith("V-")) {
    return "voucher"
  }

  for (const prefix of VOUCHER_ENTRY_PREFIXES) {
    if (normalized.startsWith(`${prefix}-`)) {
      return "voucher"
    }
  }

  for (const prefix of STOCK_DOC_PREFIXES) {
    if (normalized.startsWith(`${prefix}-`)) {
      return "stock"
    }
  }

  return "unknown"
}

type VoucherWithJournal = {
  id: string
  voucherNo: string
  status: string
  date: Date
  description: string | null
  refType: string
  refId: string
  refNo: string | null
  branchId: string
  journalEntry: {
    id: string
    postedAt: Date
    lines: Array<{ debit: Prisma.Decimal; credit: Prisma.Decimal }>
  } | null
}

function buildGlSummaryNode(
  journal: NonNullable<VoucherWithJournal["journalEntry"]>,
  voucherNo: string
): TraceNode {
  let totalDebit = ZERO
  let totalCredit = ZERO
  for (const line of journal.lines) {
    totalDebit = totalDebit.plus(toMoney(line.debit))
    totalCredit = totalCredit.plus(toMoney(line.credit))
  }

  const lineCount = journal.lines.length
  const balanced = totalDebit.equals(totalCredit)
  const debitLabel = totalDebit.toFixed(2)
  const creditLabel = totalCredit.toFixed(2)

  return {
    id: nodeKey("GeneralLedger", journal.id),
    type: "GeneralLedger",
    label: "General Ledger",
    documentNo: `GL-${voucherNo}`,
    status: balanced ? "BALANCED" : "UNBALANCED",
    date: formatIsoDate(journal.postedAt),
    description: `${lineCount} line${lineCount === 1 ? "" : "s"} / Dr=${debitLabel} Cr=${creditLabel}`,
    meta: {
      lineCount,
      totalDebit: debitLabel,
      totalCredit: creditLabel,
      balanced,
    },
  }
}

function appendVoucherDownstream(
  builder: TraceBuilder,
  voucher: VoucherWithJournal,
  fromNodeId: string,
  edgeLabel: string,
  edgeReason: string
): void {
  const voucherNodeId = nodeKey("Voucher", voucher.id)
  addNode(builder, {
    id: voucherNodeId,
    type: "Voucher",
    label: "Voucher",
    documentNo: voucher.voucherNo,
    status: voucher.status,
    date: formatIsoDate(voucher.date),
    description: voucher.description,
    href: buildPostedVoucherInquiryPath(voucher.id),
  })
  addEdge(builder, {
    from: fromNodeId,
    to: voucherNodeId,
    label: edgeLabel,
    reason: edgeReason,
  })

  if (!voucher.journalEntry) {
    addWarning(builder, `Voucher ${voucher.voucherNo} has no posted journal entry.`)
    return
  }

  const journal = voucher.journalEntry
  const journalNodeId = nodeKey("JournalEntry", journal.id)
  addNode(builder, {
    id: journalNodeId,
    type: "JournalEntry",
    label: "Journal Entry",
    documentNo: `JE-${voucher.voucherNo}`,
    status: "POSTED",
    date: formatIsoDate(journal.postedAt),
    description: voucher.description,
    href: buildFinanceJournalInquiryPath(journal.id),
  })
  addEdge(builder, {
    from: voucherNodeId,
    to: journalNodeId,
    label: "POSTED_TO_GL",
    reason: "Voucher posted to general ledger",
  })

  if (journal.lines.length === 0) {
    addWarning(builder, `Journal entry for voucher ${voucher.voucherNo} has no lines.`)
    return
  }

  const glNode = buildGlSummaryNode(journal, voucher.voucherNo)
  addNode(builder, glNode)
  addEdge(builder, {
    from: journalNodeId,
    to: glNode.id,
    label: "LEDGER_LINES",
    reason: "Journal entry line summary",
  })
}

async function findVoucherByQuery(
  prisma: DocumentTracePrisma,
  query: string,
  legalEntityCode: DocumentEntityCode
): Promise<VoucherWithJournal | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  return prisma.voucher.findFirst({
    where: {
      legalEntityCode,
      OR: [{ voucherNo: trimmed }, { refNo: trimmed }],
    },
    include: {
      journalEntry: {
        include: {
          lines: {
            select: { debit: true, credit: true },
          },
        },
      },
    },
  })
}

async function findPosSaleVoucher(
  prisma: DocumentTracePrisma,
  input: { saleId: string; receiptNo: string },
  legalEntityCode: DocumentEntityCode
): Promise<VoucherWithJournal | null> {
  return prisma.voucher.findFirst({
    where: {
      legalEntityCode,
      refType: FINANCE_REF_TYPES.POS_SALE,
      OR: [{ refId: input.saleId }, { refNo: input.receiptNo }],
    },
    include: {
      journalEntry: {
        include: {
          lines: {
            select: { debit: true, credit: true },
          },
        },
      },
    },
  })
}

async function traceFromReceipt(
  prisma: DocumentTracePrisma,
  query: string,
  legalEntityCode: DocumentEntityCode
): Promise<TraceResult> {
  const builder = createBuilder()
  const receiptNo = query.trim()

  const receipt = await prisma.receipt.findFirst({
    where: { receiptNo },
    include: {
      sale: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          branchId: true,
        },
      },
    },
  })

  if (!receipt) {
    addWarning(builder, `Receipt ${receiptNo} was not found.`)
    return { root: null, ...builder }
  }

  const receiptNodeId = nodeKey("Receipt", receipt.id)
  addNode(builder, {
    id: receiptNodeId,
    type: "Receipt",
    label: "Receipt",
    documentNo: receipt.receiptNo,
    status: receipt.sale?.status ?? "UNKNOWN",
    date: formatIsoDate(receipt.issuedAt),
    description: "POS sale receipt",
    href:
      receipt.sale != null
        ? buildPosOriginShopPath({
            refType: FINANCE_REF_TYPES.POS_SALE,
            refId: receipt.sale.id,
            branchId: receipt.sale.branchId,
          }) ?? undefined
        : undefined,
  })

  let downstreamFrom = receiptNodeId

  if (receipt.sale) {
    const saleNodeId = nodeKey("Sale", receipt.sale.id)
    addNode(builder, {
      id: saleNodeId,
      type: "Sale",
      label: "Sale",
      documentNo: receipt.receiptNo,
      status: receipt.sale.status,
      date: formatIsoDate(receipt.sale.createdAt),
      description: "POS sale transaction",
      href:
        buildPosOriginShopPath({
          refType: FINANCE_REF_TYPES.POS_SALE,
          refId: receipt.sale.id,
          branchId: receipt.sale.branchId,
        }) ?? undefined,
    })
    addEdge(builder, {
      from: receiptNodeId,
      to: saleNodeId,
      label: "CHECKOUT",
      reason: "Receipt issued for sale",
    })
    downstreamFrom = saleNodeId
  } else {
    addWarning(builder, `Receipt ${receiptNo} has no linked sale.`)
  }

  const voucher = receipt.sale
    ? await findPosSaleVoucher(
        prisma,
        { saleId: receipt.sale.id, receiptNo: receipt.receiptNo },
        legalEntityCode
      )
    : null

  if (!voucher) {
    addWarning(builder, `No posted voucher found for receipt ${receiptNo}.`)
    return { root: receiptNodeId, ...builder }
  }

  appendVoucherDownstream(builder, voucher, downstreamFrom, "POST_SALE", "POS sale posted to finance")

  return { root: receiptNodeId, ...builder }
}

async function appendPosSaleUpstream(
  prisma: DocumentTracePrisma,
  builder: TraceBuilder,
  voucher: VoucherWithJournal
): Promise<{ root: string; upstreamFrom: string } | null> {
  const saleId = voucher.refId.trim()
  if (!saleId) {
    addWarning(builder, `Voucher ${voucher.voucherNo} has no refId for POS sale lookup.`)
    return null
  }

  const receipt = await prisma.receipt.findFirst({
    where: { saleId },
    include: {
      sale: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          branchId: true,
        },
      },
    },
  })

  if (!receipt) {
    addWarning(
      builder,
      `No receipt found for POS sale refId ${saleId} (voucher ${voucher.voucherNo}).`
    )
    return null
  }

  const receiptNodeId = nodeKey("Receipt", receipt.id)
  addNode(builder, {
    id: receiptNodeId,
    type: "Receipt",
    label: "Receipt",
    documentNo: receipt.receiptNo,
    status: receipt.sale?.status ?? "UNKNOWN",
    date: formatIsoDate(receipt.issuedAt),
    description: "POS sale receipt",
    href:
      receipt.sale != null
        ? buildPosOriginShopPath({
            refType: FINANCE_REF_TYPES.POS_SALE,
            refId: receipt.sale.id,
            branchId: receipt.sale.branchId,
          }) ?? undefined
        : undefined,
  })

  let upstreamFrom = receiptNodeId

  if (receipt.sale) {
    const saleNodeId = nodeKey("Sale", receipt.sale.id)
    addNode(builder, {
      id: saleNodeId,
      type: "Sale",
      label: "Sale",
      documentNo: receipt.receiptNo,
      status: receipt.sale.status,
      date: formatIsoDate(receipt.sale.createdAt),
      description: "POS sale transaction",
      href:
        buildPosOriginShopPath({
          refType: FINANCE_REF_TYPES.POS_SALE,
          refId: receipt.sale.id,
          branchId: receipt.sale.branchId,
        }) ?? undefined,
    })
    addEdge(builder, {
      from: receiptNodeId,
      to: saleNodeId,
      label: "CHECKOUT",
      reason: "Receipt issued for sale",
    })
    upstreamFrom = saleNodeId
  }

  return { root: receiptNodeId, upstreamFrom }
}

async function traceFromVoucher(
  prisma: DocumentTracePrisma,
  query: string,
  legalEntityCode: DocumentEntityCode
): Promise<TraceResult> {
  const builder = createBuilder()
  const voucher = await findVoucherByQuery(prisma, query, legalEntityCode)

  if (!voucher) {
    addWarning(builder, `Voucher ${query.trim()} was not found.`)
    return { root: null, ...builder }
  }

  const voucherNodeId = nodeKey("Voucher", voucher.id)
  let root = voucherNodeId
  let upstreamFrom: string | null = null
  let upstreamEdge:
    | {
        label: string
        reason: string
      }
    | null = null

  if (voucher.refType === FINANCE_REF_TYPES.POS_SALE) {
    const upstream = await appendPosSaleUpstream(prisma, builder, voucher)
    if (upstream) {
      root = upstream.root
      upstreamFrom = upstream.upstreamFrom
      upstreamEdge = {
        label: "POST_SALE",
        reason: "POS sale posted to finance",
      }
    }
  } else if (voucher.refType === FINANCE_REF_TYPES.STOCK_DOC_POST && voucher.refId.trim()) {
    const stockDoc = await prisma.stockDocument.findFirst({
      where: { id: voucher.refId, legalEntityCode },
      select: {
        id: true,
        refNo: true,
        status: true,
        date: true,
        docType: true,
      },
    })

    if (stockDoc) {
      const stockNodeId = nodeKey("StockDocument", stockDoc.id)
      addNode(builder, {
        id: stockNodeId,
        type: "StockDocument",
        label: "Stock Document",
        documentNo: stockDoc.refNo,
        status: stockDoc.status,
        date: formatIsoDate(stockDoc.date),
        description: `${stockDoc.docType} stock document`,
        href: buildStockDocumentInquiryPath(stockDoc.id),
      })
      root = stockNodeId
      upstreamFrom = stockNodeId
      upstreamEdge = {
        label: "STOCK_POST",
        reason: "Stock document posted to finance",
      }
    } else {
      addWarning(
        builder,
        `Stock document refId ${voucher.refId} not found for voucher ${voucher.voucherNo}.`
      )
    }
  }

  addNode(builder, {
    id: voucherNodeId,
    type: "Voucher",
    label: "Voucher",
    documentNo: voucher.voucherNo,
    status: voucher.status,
    date: formatIsoDate(voucher.date),
    description: voucher.description,
    href: buildPostedVoucherInquiryPath(voucher.id),
  })

  if (upstreamFrom && upstreamEdge) {
    addEdge(builder, {
      from: upstreamFrom,
      to: voucherNodeId,
      label: upstreamEdge.label,
      reason: upstreamEdge.reason,
    })
  }

  if (!voucher.journalEntry) {
    addWarning(builder, `Voucher ${voucher.voucherNo} has no posted journal entry.`)
    return { root, ...builder }
  }

  const journal = voucher.journalEntry
  const journalNodeId = nodeKey("JournalEntry", journal.id)
  addNode(builder, {
    id: journalNodeId,
    type: "JournalEntry",
    label: "Journal Entry",
    documentNo: `JE-${voucher.voucherNo}`,
    status: "POSTED",
    date: formatIsoDate(journal.postedAt),
    description: voucher.description,
    href: buildFinanceJournalInquiryPath(journal.id),
  })
  addEdge(builder, {
    from: voucherNodeId,
    to: journalNodeId,
    label: "POSTED_TO_GL",
    reason: "Voucher posted to general ledger",
  })

  if (journal.lines.length === 0) {
    addWarning(builder, `Journal entry for voucher ${voucher.voucherNo} has no lines.`)
    return { root, ...builder }
  }

  const glNode = buildGlSummaryNode(journal, voucher.voucherNo)
  addNode(builder, glNode)
  addEdge(builder, {
    from: journalNodeId,
    to: glNode.id,
    label: "LEDGER_LINES",
    reason: "Journal entry line summary",
  })

  return { root, ...builder }
}

async function traceFromStockDocument(
  prisma: DocumentTracePrisma,
  query: string,
  legalEntityCode: DocumentEntityCode
): Promise<TraceResult> {
  const builder = createBuilder()
  const refNo = query.trim()

  const stockDoc = await prisma.stockDocument.findFirst({
    where: { refNo, legalEntityCode },
    select: {
      id: true,
      refNo: true,
      status: true,
      date: true,
      docType: true,
    },
  })

  if (!stockDoc) {
    addWarning(builder, `Stock document ${refNo} was not found.`)
    return { root: null, ...builder }
  }

  const stockNodeId = nodeKey("StockDocument", stockDoc.id)
  addNode(builder, {
    id: stockNodeId,
    type: "StockDocument",
    label: "Stock Document",
    documentNo: stockDoc.refNo,
    status: stockDoc.status,
    date: formatIsoDate(stockDoc.date),
    description: `${stockDoc.docType} stock document`,
    href: buildStockDocumentInquiryPath(stockDoc.id),
  })

  const voucher = await prisma.voucher.findFirst({
    where: {
      legalEntityCode,
      refType: FINANCE_REF_TYPES.STOCK_DOC_POST,
      OR: [{ refId: stockDoc.id }, { refNo: stockDoc.refNo }],
    },
    include: {
      journalEntry: {
        include: {
          lines: {
            select: { debit: true, credit: true },
          },
        },
      },
    },
  })

  if (!voucher) {
    addWarning(builder, `No posted voucher found for stock document ${refNo}.`)
    return { root: stockNodeId, ...builder }
  }

  appendVoucherDownstream(
    builder,
    voucher,
    stockNodeId,
    "STOCK_POST",
    "Stock document posted to finance"
  )

  return { root: stockNodeId, ...builder }
}

export async function traceFinanceDocument(
  prisma: DocumentTracePrisma,
  input: DocumentTraceInput
): Promise<TraceResult> {
  const query = input.query.trim()
  const legalEntityCode = input.legalEntityCode.trim() as DocumentEntityCode

  if (!query) {
    return {
      root: null,
      nodes: [],
      edges: [],
      warnings: ["Enter a document number to trace."],
    }
  }

  const kind = detectDocumentTraceQueryKind(query)

  switch (kind) {
    case "receipt":
      return traceFromReceipt(prisma, query, legalEntityCode)
    case "voucher":
      return traceFromVoucher(prisma, query, legalEntityCode)
    case "stock":
      return traceFromStockDocument(prisma, query, legalEntityCode)
    default:
      return {
        root: null,
        nodes: [],
        edges: [],
        warnings: [
          `Could not detect document type for "${query}". Try REC-, V-, MJV/PAV/REV/PCV, or stock document numbers (CNT/ADJ/ORD/DEY/ORS/ORI).`,
        ],
      }
  }
}
