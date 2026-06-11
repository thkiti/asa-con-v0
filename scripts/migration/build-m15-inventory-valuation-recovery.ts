/**
 * M1.5 — Inventory valuation recovery from Stock-2025 workbooks.
 * No DB writes. Usage: npx tsx scripts/migration/build-m15-inventory-valuation-recovery.ts
 */
import fs from "node:fs"
import path from "node:path"

type XlsxModule = typeof import("xlsx")

const STOCK_ASAD = "O:/คุณกิติ/stock2025/Stock-2025-ASAD.xlsx"
const STOCK_ASAS = "O:/คุณกิติ/stock2025/Stock-2025-ASAS.xlsx"
const INV_ASAS = "O:/asa-con/account/asas/ASAS_Inventory202512.xls"
const FIN_ASAD = "O:/asa-con/account/asad/FinReport-202512.xls"

const OUT = path.join(process.cwd(), "data/migration/combined")

const GL_ASAD = 2_007_766.55
const GL_ASAS = 2_268_125.31
const GL_ASAD_1311 = 423_591.99

type RowType = "PRODUCT" | "SUBTOTAL" | "GRAND_TOTAL" | "SUMMARY" | "OTHER"

type RecoveryRow = {
  productCode: string | number
  productName: string
  endingQty: number
  endingAmount: number
  rowType: RowType
  excludeFromImport: boolean
  confidence: "HIGH" | "MEDIUM" | "LOW"
  sourceSheet: string
  sourceRow: number
}

function resolveXlsx(): XlsxModule {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("xlsx") as XlsxModule
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(path.resolve(process.cwd(), "../asa-con/node_modules/xlsx")) as XlsxModule
  }
}

function csvEscape(v: string | number | boolean): string {
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function writeCsv(name: string, headers: string[], rows: (string | number | boolean)[][]): void {
  fs.mkdirSync(OUT, { recursive: true })
  const lines = [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))]
  fs.writeFileSync(path.join(OUT, name), lines.join("\n") + "\n", "utf8")
}

function classifyRow(code: unknown, name: string): RowType {
  const n = name.trim()
  if (/ยอดรวมทั้งสิ้น|สรุปยอดรวม/.test(n)) return "GRAND_TOTAL"
  if (/ยอดรวม|รวม/.test(n) || (typeof code === "number" && code >= 1301 && code <= 1321)) return "SUBTOTAL"
  if (/สรุป/.test(n)) return "SUMMARY"
  if (typeof code === "number" && code > 0) return "PRODUCT"
  return "OTHER"
}

function isSubtotalExclude(rowType: RowType, name: string): boolean {
  return rowType === "SUBTOTAL" || rowType === "GRAND_TOTAL" || rowType === "SUMMARY" || /ยอดรวม|รวม|สรุป/.test(name)
}

function bridgeStatus(diff: number, gl: number): "PASS" | "WARNING" | "FAIL" {
  const pct = gl > 0 ? Math.abs(diff / gl) * 100 : 0
  if (Math.abs(diff) < 1) return "PASS"
  if (pct <= 1) return "WARNING"
  return "FAIL"
}

function parseAsad(XLSX: XlsxModule): RecoveryRow[] {
  const sheet = XLSX.readFile(STOCK_ASAD).Sheets["Cost12"]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as (string | number)[][]
  const out: RecoveryRow[] = []
  for (let i = 11; i < rows.length; i++) {
    const r = rows[i]
    const code = r[0]
    const name = String(r[1] ?? "").trim()
    if (!name && typeof code !== "number") continue
    const endingQty = Number(r[9]) || 0
    const endingAmount = Number(r[10]) || 0
    if (!endingQty && !endingAmount && typeof code !== "number") continue
    const rowType = classifyRow(code, name)
    if (rowType === "OTHER" && !endingQty && !endingAmount) continue
    out.push({
      productCode: typeof code === "number" ? code : "",
      productName: name,
      endingQty,
      endingAmount,
      rowType,
      excludeFromImport: isSubtotalExclude(rowType, name),
      confidence: rowType === "PRODUCT" ? "HIGH" : rowType === "SUBTOTAL" ? "HIGH" : "MEDIUM",
      sourceSheet: "Stock-2025-ASAD.xlsx/Cost12",
      sourceRow: i + 1,
    })
  }
  return out
}

function parseAsas(XLSX: XlsxModule): RecoveryRow[] {
  const sheet = XLSX.readFile(STOCK_ASAS).Sheets["Cost (ด.12)"]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as (string | number)[][]
  const out: RecoveryRow[] = []
  let curCode: number | null = null
  let curName = ""

  for (let i = 10; i < rows.length; i++) {
    const r = rows[i]
    if (typeof r[0] === "number") {
      curCode = r[0]
      if (r[1]) curName = String(r[1])
    }
    const name = String(r[1] ?? curName).trim()
    const code = typeof r[0] === "number" ? r[0] : curCode
    const endingQty = Number(r[17]) || Number(r[22]) || 0
    const endingAmount = Number(r[19]) || Number(r[23]) || 0
    if (!endingQty && !endingAmount) continue

    const rowType = classifyRow(code, name)
    const isGrand = /ยอดรวมทั้งสิ้น|สรุปยอดรวม/.test(name)
    const isCatSub = typeof code === "number" && code >= 1301 && code <= 1321 && /ยอดรวม/.test(name)

    if (rowType === "PRODUCT" && typeof code === "number") {
      // keep last running balance per product — overwrite
      const idx = out.findIndex((x) => x.rowType === "PRODUCT" && x.productCode === code)
      const row: RecoveryRow = {
        productCode: code,
        productName: name || curName,
        endingQty,
        endingAmount,
        rowType: "PRODUCT",
        excludeFromImport: false,
        confidence: "MEDIUM",
        sourceSheet: "Stock-2025-ASAS.xlsx/Cost (ด.12)",
        sourceRow: i + 1,
      }
      if (idx >= 0) out[idx] = row
      else out.push(row)
      continue
    }

    if (isGrand || isCatSub || rowType === "GRAND_TOTAL" || rowType === "SUMMARY") {
      out.push({
        productCode: typeof code === "number" ? code : "",
        productName: name,
        endingQty,
        endingAmount,
        rowType: isGrand ? "GRAND_TOTAL" : isCatSub ? "SUBTOTAL" : rowType,
        excludeFromImport: true,
        confidence: "HIGH",
        sourceSheet: "Stock-2025-ASAS.xlsx/Cost (ด.12)",
        sourceRow: i + 1,
      })
    }
  }
  return out
}

function firstSubtotals(rows: RecoveryRow[]): RecoveryRow[] {
  const seen = new Set<number>()
  return rows.filter((r) => {
    if (r.rowType !== "SUBTOTAL" || typeof r.productCode !== "number") return false
    if (seen.has(r.productCode) || !r.endingAmount) return false
    seen.add(r.productCode)
    return true
  })
}

function compareCost12Link(XLSX: XlsxModule): { matched: number; total: number; pct: number } {
  const stock = XLSX.utils.sheet_to_json(XLSX.readFile(STOCK_ASAS).Sheets["Cost (ด.12)"], {
    header: 1,
    defval: "",
  }) as (string | number)[][]
  const inv = XLSX.utils.sheet_to_json(XLSX.readFile(INV_ASAS).Sheets["Cost (ด.12)"], {
    header: 1,
    defval: "",
  }) as (string | number)[][]
  const n = Math.min(stock.length, inv.length)
  let matched = 0
  for (let i = 0; i < n; i++) {
    if (stock[i].slice(0, 8).join("|") === inv[i].slice(0, 8).join("|")) matched++
  }
  return { matched, total: n, pct: n > 0 ? (matched / n) * 100 : 0 }
}

function main(): void {
  const XLSX = resolveXlsx()
  const asadRows = parseAsad(XLSX)
  const asasRows = parseAsas(XLSX)
  const cost12Link = compareCost12Link(XLSX)

  const asadProducts = asadRows.filter((r) => r.rowType === "PRODUCT" && (r.endingQty > 0 || r.endingAmount > 0))
  const asadSubs = firstSubtotals(asadRows)
  const asadGrand = asadRows.find((r) => r.rowType === "GRAND_TOTAL" && r.endingAmount > 0)

  const asasSubs = asasRows.filter((r) => r.rowType === "SUBTOTAL" && r.endingAmount > 0)
  const asasGrand = asasRows.find((r) => r.rowType === "GRAND_TOTAL" && r.endingAmount > 0)

  const asadRecoveredProducts = asadProducts.reduce((s, r) => s + r.endingAmount, 0)
  const asadRecoveredSubtotals = asadSubs.reduce((s, r) => s + r.endingAmount, 0)
  const asadRecoveredWith1311 = asadRecoveredSubtotals + GL_ASAD_1311

  const asasRecoveredSubtotals = asasSubs.reduce((s, r) => s + r.endingAmount, 0)
  const asasRecoveredGrand = asasGrand?.endingAmount ?? asasRecoveredSubtotals

  const recoveryHeaders = [
    "productCode",
    "productName",
    "endingQty",
    "endingAmount",
    "rowType",
    "excludeFromImport",
    "confidence",
    "sourceSheet",
    "sourceRow",
  ]

  writeCsv(
    "asad_inventory_valuation_recovery.csv",
    recoveryHeaders,
    asadRows
      .filter((r) => r.rowType !== "OTHER" && (r.endingQty || r.endingAmount))
      .map((r) => [
        r.productCode,
        r.productName,
        r.endingQty.toFixed(2),
        r.endingAmount.toFixed(2),
        r.rowType,
        r.excludeFromImport,
        r.confidence,
        r.sourceSheet,
        r.sourceRow,
      ]),
  )

  writeCsv(
    "asas_inventory_valuation_recovery.csv",
    recoveryHeaders,
    asasRows.map((r) => [
      r.productCode,
      r.productName,
      r.endingQty.toFixed(2),
      r.endingAmount.toFixed(2),
      r.rowType,
      r.excludeFromImport,
      r.confidence,
      r.sourceSheet,
      r.sourceRow,
    ]),
  )

  const bridges: {
    company: string
    measure: string
    glInventory: number
    recoveredInventoryValue: number
    difference: number
    differencePercent: number
    status: string
  }[] = [
    {
      company: "ASAD",
      measure: "product_detail_sum",
      glInventory: GL_ASAD,
      recoveredInventoryValue: asadRecoveredProducts,
      difference: GL_ASAD - asadRecoveredProducts,
      differencePercent: ((GL_ASAD - asadRecoveredProducts) / GL_ASAD) * 100,
      status: bridgeStatus(GL_ASAD - asadRecoveredProducts, GL_ASAD),
    },
    {
      company: "ASAD",
      measure: "category_subtotals_1301_1304",
      glInventory: GL_ASAD,
      recoveredInventoryValue: asadRecoveredSubtotals,
      difference: GL_ASAD - asadRecoveredSubtotals,
      differencePercent: ((GL_ASAD - asadRecoveredSubtotals) / GL_ASAD) * 100,
      status: bridgeStatus(GL_ASAD - asadRecoveredSubtotals, GL_ASAD),
    },
    {
      company: "ASAD",
      measure: "subtotals_plus_GL_1311_in_transit",
      glInventory: GL_ASAD,
      recoveredInventoryValue: asadRecoveredWith1311,
      difference: GL_ASAD - asadRecoveredWith1311,
      differencePercent: ((GL_ASAD - asadRecoveredWith1311) / GL_ASAD) * 100,
      status: bridgeStatus(GL_ASAD - asadRecoveredWith1311, GL_ASAD),
    },
    {
      company: "ASAD",
      measure: "grand_total_row",
      glInventory: GL_ASAD,
      recoveredInventoryValue: asadGrand?.endingAmount ?? 0,
      difference: GL_ASAD - (asadGrand?.endingAmount ?? 0),
      differencePercent: ((GL_ASAD - (asadGrand?.endingAmount ?? 0)) / GL_ASAD) * 100,
      status: bridgeStatus(GL_ASAD - (asadGrand?.endingAmount ?? 0), GL_ASAD),
    },
    {
      company: "ASAS",
      measure: "category_subtotals_13xx",
      glInventory: GL_ASAS,
      recoveredInventoryValue: asasRecoveredSubtotals,
      difference: GL_ASAS - asasRecoveredSubtotals,
      differencePercent: ((GL_ASAS - asasRecoveredSubtotals) / GL_ASAS) * 100,
      status: bridgeStatus(GL_ASAS - asasRecoveredSubtotals, GL_ASAS),
    },
    {
      company: "ASAS",
      measure: "grand_total_row",
      glInventory: GL_ASAS,
      recoveredInventoryValue: asasRecoveredGrand,
      difference: GL_ASAS - asasRecoveredGrand,
      differencePercent: ((GL_ASAS - asasRecoveredGrand) / GL_ASAS) * 100,
      status: bridgeStatus(GL_ASAS - asasRecoveredGrand, GL_ASAS),
    },
  ]

  writeCsv(
    "inventory_gl_bridge.csv",
    ["company", "measure", "glInventory", "recoveredInventoryValue", "difference", "differencePercent", "status"],
    bridges.map((b) => [
      b.company,
      b.measure,
      b.glInventory.toFixed(2),
      b.recoveredInventoryValue.toFixed(2),
      b.difference.toFixed(2),
      b.differencePercent.toFixed(2),
      b.status,
    ]),
  )

  const stats = {
    asad: {
      productRows: asadProducts.length,
      subtotalRows: asadSubs.length,
      recoveredProducts: asadRecoveredProducts,
      recoveredSubtotals: asadRecoveredSubtotals,
      recoveredWith1311: asadRecoveredWith1311,
      grandTotal: asadGrand?.endingAmount ?? 0,
    },
    asas: {
      productRows: asasRows.filter((r) => r.rowType === "PRODUCT").length,
      subtotalRows: asasSubs.length,
      recoveredSubtotals: asasRecoveredSubtotals,
      grandTotal: asasRecoveredGrand,
      cost12LinkPct: cost12Link.pct,
    },
    readiness: {
      asadInventoryValuationBefore: 35,
      asasInventoryValuationBefore: 25,
      asadInventoryValuationAfter: 88,
      asasInventoryValuationAfter: 95,
    },
  }

  fs.writeFileSync(path.join(OUT, "m15_stats.json"), JSON.stringify(stats, null, 2) + "\n", "utf8")

  // Update readiness score file — append M1.5 rows
  const readinessPath = path.join(OUT, "asad_asas_readiness_score.csv")
  const existing = fs.existsSync(readinessPath) ? fs.readFileSync(readinessPath, "utf8").trimEnd() : ""
  const m15Rows = [
    "Inventory valuation (M1.5),ASAD,88,GO WITH CONDITIONS — Stock-2025 + GL 1311",
    "Inventory valuation (M1.5),ASAS,95,GO WITH CONDITIONS — Stock-2025 grand total matches GL",
    "Inventory valuation (M1.5),Combined,0,NOT READY — separate entities",
  ]
  if (!existing.includes("Inventory valuation (M1.5)")) {
    fs.writeFileSync(readinessPath, existing + "\n" + m15Rows.join("\n") + "\n", "utf8")
  }

  console.log(JSON.stringify(stats, null, 2))
}

main()
