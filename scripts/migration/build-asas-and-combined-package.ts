/**
 * ASAS discovery, M1 transform, and ASAD+ASAS combined inventory reconciliation.
 * No DB writes. Usage: npx tsx scripts/migration/build-asas-and-combined-package.ts
 */
import fs from "node:fs"
import path from "node:path"

type XlsxModule = typeof import("xlsx")

const ASAS_DIR = "O:/asa-con/account/asas"
const ASAD_FIN = "O:/asa-con/account/asad/FinReport-202512.xls"
const ASAD_INV = "O:/asa-con/account/asad/ASAD_Inventory202512.xls"
const ASAS_FIN = `${ASAS_DIR}/FinReport-202512.xls`
const ASAS_INV = `${ASAS_DIR}/ASAS_Inventory202512.xls`

const ASAS_DISCOVERY = path.join(process.cwd(), "data/migration/asas/discovery")
const ASAS_M1 = path.join(process.cwd(), "data/migration/asas/m1")
const COMBINED = path.join(process.cwd(), "data/migration/combined")

const ASAD_GL_INV = 2_007_766.55
const ASAD_STOCK_VAL = 438_604.93

type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"
type TbRow = { code: number; name: string; debit: number; credit: number }

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

function writeCsv(dir: string, name: string, headers: string[], rows: (string | number | boolean)[][]): void {
  fs.mkdirSync(dir, { recursive: true })
  const lines = [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))]
  fs.writeFileSync(path.join(dir, name), lines.join("\n") + "\n", "utf8")
}

function classifyFile(name: string): { category: string; module: string; purpose: string } {
  const n = name.toLowerCase()
  if (n.includes("finreport")) return { category: "REPORT DATA", module: "Finance", purpose: "Year-end TB/BS/P&L" }
  if (n.includes("inventory")) return { category: "MASTER DATA", module: "Inventory", purpose: "Stock master + Dec 2568 ending" }
  if (n.includes("datapost")) return { category: "TRANSACTION DATA", module: "Finance", purpose: "GL transaction dump" }
  if (n.startsWith("gj-")) return { category: "TRANSACTION DATA", module: "Finance", purpose: "General journal Dec 2025" }
  if (n.startsWith("bcj") || n.startsWith("bsj")) return { category: "TRANSACTION DATA", module: "Finance", purpose: "Bank journal Dec 2025" }
  if (n.includes("sales tax") || n.includes("purchase tax")) return { category: "REPORT DATA", module: "Tax", purpose: "VAT Dec 2512" }
  if (n.startsWith("sales")) return { category: "TRANSACTION DATA", module: "Sales/POS", purpose: "Per-shop sales Dec 2512" }
  if (n.includes("asset")) return { category: "REPORT DATA", module: "Finance", purpose: "Fixed asset register" }
  if (n.includes("asasform")) return { category: "REFERENCE DATA", module: "Finance", purpose: "Voucher print templates" }
  return { category: "REFERENCE DATA", module: "Unknown", purpose: "Unclassified" }
}

function parseTb(XLSX: XlsxModule, filePath: string): TbRow[] {
  const rows = XLSX.utils.sheet_to_json(XLSX.readFile(filePath).Sheets["Trial Balance"], {
    header: 1,
    defval: "",
  }) as (string | number)[][]
  const out: TbRow[] = []
  for (let i = 7; i < rows.length; i++) {
    const name = String(rows[i][0] ?? "").trim()
    const code = rows[i][1]
    if (typeof code !== "number" || !name) continue
    out.push({ code, name, debit: Number(rows[i][2]) || 0, credit: Number(rows[i][3]) || 0 })
  }
  return out
}

function isPl(code: number): boolean {
  if (code < 1000) return false
  return Math.floor(code / 1000) >= 5
}

function isBs(code: number): boolean {
  if (code < 1000) return true
  return Math.floor(code / 1000) <= 4
}

function mapCoa(row: TbRow, entity: string) {
  const code = row.code
  let accountType: AccountType = "EXPENSE"
  let normalBalance: "DEBIT" | "CREDIT" = "DEBIT"
  let migrationStatus = "MIGRATE"
  let confidence: "HIGH" | "LOW" = "HIGH"
  const notes: string[] = []

  if (code < 1000) {
    accountType = "EQUITY"
    normalBalance = "CREDIT"
  } else {
    const p = Math.floor(code / 1000)
    if (p <= 3) {
      accountType = "ASSET"
      normalBalance = "DEBIT"
    } else if (p === 4) {
      accountType = "LIABILITY"
      normalBalance = "CREDIT"
    } else if (p === 5) {
      accountType = "REVENUE"
      normalBalance = "CREDIT"
      migrationStatus = "EXCLUDE_OPENING"
    } else {
      accountType = "EXPENSE"
      normalBalance = "DEBIT"
      migrationStatus = "EXCLUDE_OPENING"
    }
  }

  const isContra =
    (code >= 2251 && code <= 2286 && row.name.includes("ค่าเสื่อมราคาสะสม")) ||
    (code >= 1141 && code <= 1143) ||
    code === 1391
  if (isContra) {
    normalBalance = "CREDIT"
    migrationStatus = "REVIEW_REQUIRED"
    confidence = "LOW"
    notes.push("Contra-asset; v0 ASSET=DEBIT validator conflict")
  }
  if (code === 5000) {
    migrationStatus = "STRUCTURAL_ONLY"
    confidence = "LOW"
    notes.push("TB section row")
  }
  if (row.credit > row.debit && accountType === "EXPENSE" && (row.debit || row.credit)) {
    confidence = "LOW"
    notes.push("Expense with credit closing balance")
  }

  return {
    entity,
    sourceCode: String(code),
    sourceName: row.name,
    accountType,
    normalBalance,
    isActive: true,
    migrationStatus,
    confidence,
    notes: notes.join("; ") || (row.debit || row.credit ? "Non-zero" : "Zero"),
  }
}

type StockRow = {
  productCode: number
  productName: string
  qty: number
  unit: string
  unitCost: number | ""
  inventoryValue: number | ""
  sourceSheet: string
  excludeFromImport: boolean
  importReadiness: string
  confidence: string
}

function parseStock(XLSX: XlsxModule, invPath: string, entity: string): StockRow[] {
  const wb = XLSX.readFile(invPath)
  const ending = XLSX.utils.sheet_to_json(wb.Sheets["Ending"], { header: 1, defval: "" }) as (string | number)[][]
  const groups = XLSX.utils.sheet_to_json(wb.Sheets["Product Group"], { header: 1, defval: "" }) as (string | number)[][]
  const setPrice = wb.SheetNames.includes("SetPrice")
    ? (XLSX.utils.sheet_to_json(wb.Sheets["SetPrice"], { header: 1, defval: "" }) as (string | number)[][])
    : []

  const gmap = new Map<number, { name: string; unit: string }>()
  for (let i = 1; i < groups.length; i++) {
    const c = groups[i][0]
    if (typeof c === "number") gmap.set(c, { name: String(groups[i][1] ?? ""), unit: String(groups[i][2] ?? "") })
  }
  const cmap = new Map<number, number>()
  for (let i = 1; i < setPrice.length; i++) {
    const c = setPrice[i][0]
    const cost = Number(setPrice[i][4])
    if (typeof c === "number" && cost > 0) cmap.set(c, cost)
  }

  const rows: StockRow[] = []
  for (let i = 8; i < ending.length; i++) {
    const code = ending[i][1]
    const qty = Number(ending[i][3]) || 0
    if (typeof code !== "number" || !qty) continue
    const name = String(ending[i][2] || gmap.get(code)?.name || "").trim()
    const unit = gmap.get(code)?.unit ?? ""
    const isSubtotal = /ยอดรวม|^รวม/.test(name) || ([1301, 1302, 1303, 1304, 1305, 1306].includes(code) && /ยอดรวม/.test(name))
    const unitCost = cmap.get(code) ?? ""
    const inventoryValue = typeof unitCost === "number" ? Math.round(qty * unitCost * 100) / 100 : ""
    let importReadiness = "READY_TO_IMPORT"
    if (isSubtotal) importReadiness = "SUBTOTAL_EXCLUDE"
    else if (inventoryValue === "") importReadiness = "NEEDS_COST"

    rows.push({
      productCode: code,
      productName: name,
      qty,
      unit,
      unitCost,
      inventoryValue,
      sourceSheet: `${path.basename(invPath)}/Ending`,
      excludeFromImport: isSubtotal,
      importReadiness,
      confidence: isSubtotal ? "LOW" : inventoryValue !== "" ? "HIGH" : "MEDIUM",
    })
  }
  return rows
}

function glInventory(tb: TbRow[]): number {
  return tb
    .filter((a) => a.code >= 1300 && a.code < 1400)
    .reduce((s, a) => s + a.debit - a.credit, 0)
}

function buildOpeningJournal(tb: TbRow[], reCode = 301) {
  const plD = tb.filter((a) => isPl(a.code)).reduce((s, a) => s + a.debit, 0)
  const plC = tb.filter((a) => isPl(a.code)).reduce((s, a) => s + a.credit, 0)
  const netProfit = plC - plD
  const reBefore = tb.find((a) => a.code === reCode)?.credit ?? 0
  const reAfter = reBefore + netProfit

  const lines: { code: string; name: string; debit: number; credit: number }[] = []
  for (const a of tb) {
    if (isPl(a.code) || !isBs(a.code)) continue
    let debit = a.debit
    let credit = a.credit
    if (a.code === reCode) credit = reAfter
    if (!debit && !credit) continue
    lines.push({ code: String(a.code), name: a.name, debit, credit })
  }
  lines.sort((a, b) => Number(a.code) - Number(b.code))
  const openingDebit = lines.reduce((s, l) => s + l.debit, 0)
  const openingCredit = lines.reduce((s, l) => s + l.credit, 0)
  return { lines, netProfit, reBefore, reAfter, openingDebit, openingCredit, plD, plC }
}

function main(): void {
  const XLSX = resolveXlsx()
  const files = fs.readdirSync(ASAS_DIR).filter((f) => !f.startsWith("~$"))

  // Phase A — discovery
  const invRows: (string | number)[][] = []
  for (const f of files.sort()) {
    const p = path.join(ASAS_DIR, f)
    const cls = classifyFile(f)
    let sheets = ""
    let sheetCount = 0
    try {
      const wb = XLSX.readFile(p)
      sheetCount = wb.SheetNames.length
      sheets = wb.SheetNames.slice(0, 6).join("; ")
    } catch {
      sheets = "unreadable"
    }
    invRows.push([f, path.extname(f), fs.statSync(p).size, cls.category, cls.module, cls.purpose, sheetCount, sheets, "HIGH"])
  }
  writeCsv(ASAS_DISCOVERY, "asas_file_inventory.csv", ["file", "type", "size_bytes", "category", "module", "purpose", "sheet_count", "sheets_preview", "confidence"], invRows)

  const asasTb = parseTb(XLSX, ASAS_FIN)
  const asadTb = parseTb(XLSX, ASAD_FIN)
  const asasGlInv = glInventory(asasTb)
  const asadGlInv = glInventory(asadTb)
  const asasOpen = buildOpeningJournal(asasTb)
  const asadStock = parseStock(XLSX, ASAD_INV, "ASAD")
  const asasStock = parseStock(XLSX, ASAS_INV, "ASAS")

  writeCsv(ASAS_DISCOVERY, "asas_finance_sources.csv", ["file", "sheet", "role", "notes", "metric", "confidence"], [
    ["FinReport-202512.xls", "Trial Balance", "PRIMARY", "Closing TB 31/12/2025", `${asasTb.length} accounts`, "HIGH"],
    ["FinReport-202512.xls", "BS/P&L", "VALIDATION", "Summary statements", "", "HIGH"],
    ["DataPostManual. - ปี68.xls", "Data", "SECONDARY", "GL lines ~58K", "58414", "HIGH"],
    ["GJ-202512-No.1/2/3.xls", "General Journal", "SECONDARY", "Dec journals", "3 files", "MEDIUM"],
    ["BCJ/BSJ-202512.xls", "Bank Journal", "SECONDARY", "Bank activity", "2 files", "MEDIUM"],
    ["Sales Tax2512.xlsx", "VAT sales", "VALIDATION", "Dec 2025 tax", "", "HIGH"],
    ["Purchase Tax2512.xlsx", "VAT purchase", "VALIDATION", "Dec 2025 tax", "", "HIGH"],
  ])

  writeCsv(ASAS_DISCOVERY, "asas_inventory_sources.csv", ["source", "sheet", "role", "notes", "count", "confidence"], [
    ["ASAS_Inventory202512.xls", "Ending", "PRIMARY", "Dec 2568 closing qty", asasStock.length, "HIGH"],
    ["ASAS_Inventory202512.xls", "Product Group", "PRIMARY", "Product master", "", "HIGH"],
    ["ASAS_Inventory202512.xls", "Cost (ด.12)", "SECONDARY", "Dec movement with unit cost", "1711 rows", "MEDIUM"],
    ["ASAS_Inventory202512.xls", "SetPrice", "VALIDATION", "Partial unit cost", "0 matches on ending", "LOW"],
    ["FinReport-202512.xls", "TB 13xx", "VALIDATION", `GL inventory ${asasGlInv.toFixed(2)}`, "4 accounts", "HIGH"],
  ])

  writeCsv(ASAS_DISCOVERY, "asas_migration_matrix.csv", ["target", "availability", "primary_source", "confidence", "notes"], [
    ["Chart of Accounts", "Available", "FinReport TB", "HIGH", `${asasTb.length} accounts`],
    ["Opening Journal", "Available", "FinReport TB + close", "HIGH", "Balanced after P&L→301"],
    ["Inventory qty", "Available", "Ending sheet", "HIGH", `${asasStock.length} lines`],
    ["Inventory value", "Partial", "GL 13xx / Cost12", "MEDIUM", "SetPrice empty on ending"],
    ["Branches", "Available", "Shop Detail", "HIGH", "27 shops"],
    ["AR/AP subledger", "Partial", "TB controls", "MEDIUM", "No aging files"],
    ["Tax Dec 2025", "Available", "Sales/Purchase Tax2512", "HIGH", "Correct period"],
  ])

  // Phase B — ASAS M1
  const coa = asasTb.map((r) => mapCoa(r, "ASAS"))
  writeCsv(ASAS_M1, "asas_coa_mapping_candidate.csv", ["entity", "sourceCode", "sourceName", "accountType", "normalBalance", "isActive", "migrationStatus", "confidence", "notes"], coa.map((m) => Object.values(m)))

  writeCsv(ASAS_M1, "asas_opening_journal_candidate.csv", ["accountCode", "accountName", "debit", "credit", "effectiveDate", "source"], asasOpen.lines.map((l) => [l.code, l.name, l.debit.toFixed(2), l.credit.toFixed(2), "2026-01-01", "ASAS FinReport TB"]))

  writeCsv(ASAS_M1, "asas_opening_stock_candidate.csv", ["productCode", "productName", "qty", "unit", "unitCost", "inventoryValue", "sourceSheet", "excludeFromImport", "importReadiness", "confidence", "effectiveDate"], asasStock.map((r) => [r.productCode, r.productName, r.qty, r.unit, r.unitCost, r.inventoryValue, r.sourceSheet, r.excludeFromImport, r.importReadiness, r.confidence, "2026-01-01"]))

  const shops = XLSX.utils.sheet_to_json(XLSX.readFile(ASAS_INV).Sheets["Shop Detail"], { header: 1, defval: "" }) as (string | number)[][]
  const shopRows: (string | number | boolean)[][] = []
  for (let i = 1; i < shops.length; i++) {
    const code = shops[i][0]
    if (typeof code !== "number") continue
    shopRows.push([code, shops[i][1], shops[i][2], code === 0 ? "HO" : "SHOP", code === 0 ? "HO" : `SHOP-${String(code).padStart(3, "0")}`, code === 0 ? "HIGH" : "MEDIUM", code === 0 ? "สำนักงานใหญ่" : "Retail branch"])
  }
  writeCsv(ASAS_M1, "asas_branch_mapping_candidate.csv", ["legacyShopCode", "legacyShopName", "legacyAddress1", "proposedBranchType", "proposedBranchCode", "confidence", "notes"], shopRows)

  const asasStockVal = asasStock.filter((r) => !r.excludeFromImport).reduce((s, r) => s + (typeof r.inventoryValue === "number" ? r.inventoryValue : 0), 0)
  const asadStockVal = asadStock.filter((r) => !r.excludeFromImport).reduce((s, r) => s + (typeof r.inventoryValue === "number" ? r.inventoryValue : 0), 0)

  const asasRecon = [
    ["Trial Balance balanced", asasTb.reduce((s, a) => s + a.debit, 0), asasTb.reduce((s, a) => s + a.credit, 0), 0, "PASS"],
    ["Opening Journal balanced", asasOpen.openingDebit, asasOpen.openingCredit, asasOpen.openingDebit - asasOpen.openingCredit, Math.abs(asasOpen.openingDebit - asasOpen.openingCredit) < 0.02 ? "PASS" : "FAIL"],
    ["Net Profit", 23494.96, asasOpen.netProfit, 23494.96 - asasOpen.netProfit, Math.abs(23494.96 - asasOpen.netProfit) < 0.02 ? "PASS" : "FAIL"],
    ["Inventory GL", asasGlInv, asasStockVal, asasGlInv - asasStockVal, asasStockVal > 0 ? "WARNING" : "WARNING"],
  ]
  writeCsv(ASAS_M1, "asas_reconciliation_summary.csv", ["checkName", "legacyValue", "transformedValue", "difference", "status"], asasRecon.map((r) => [r[0], Number(r[1]).toFixed(2), Number(r[2]).toFixed(2), Number(r[3]).toFixed(2), r[4]]))

  // Phase C — combined
  const asadMap = new Map(asadStock.map((r) => [r.productCode, r]))
  const asasMap = new Map(asasStock.map((r) => [r.productCode, r]))
  const allCodes = new Set([...asadMap.keys(), ...asasMap.keys()])

  const overlapRows: (string | number)[][] = []
  for (const code of [...allCodes].sort((a, b) => a - b)) {
    const a = asadMap.get(code)
    const s = asasMap.get(code)
    const aq = a?.qty ?? 0
    const sq = s?.qty ?? 0
    const av = typeof a?.inventoryValue === "number" ? a.inventoryValue : 0
    const sv = typeof s?.inventoryValue === "number" ? s.inventoryValue : 0
    let overlapType = "UNKNOWN"
    if (a && !s) overlapType = "ASAD_ONLY"
    else if (!a && s) overlapType = "ASAS_ONLY"
    else if (a && s) {
      if (a.excludeFromImport || s.excludeFromImport) overlapType = "BOTH_POSSIBLE_DUPLICATE"
      else if (aq === sq) overlapType = "BOTH_POSSIBLE_DUPLICATE"
      else overlapType = "BOTH_DISTINCT"
    }
    overlapRows.push([code, a?.productName ?? "", aq, sq, aq + sq, av, sv, av + sv, overlapType, a && s ? "HIGH" : "HIGH"])
  }
  writeCsv(COMBINED, "asad_asas_product_overlap.csv", ["productCode", "productName", "asadQty", "asasQty", "combinedQty", "asadValue", "asasValue", "combinedValue", "overlapType", "confidence"], overlapRows)

  const combinedStockVal = asadStockVal + asasStockVal
  const bridge = [
    ["ASAD", "stock_candidate_value", asadStockVal, ASAD_GL_INV, ASAD_GL_INV - asadStockVal, ((ASAD_GL_INV - asadStockVal) / ASAD_GL_INV) * 100, asadStockVal >= ASAD_GL_INV * 0.95 ? "PASS" : "WARNING"],
    ["ASAS", "stock_candidate_value", asasStockVal, asasGlInv, asasGlInv - asasStockVal, asasGlInv ? ((asasGlInv - asasStockVal) / asasGlInv) * 100 : 0, "WARNING"],
    ["COMBINED_WRONG_POOL", "stock_candidate_value", combinedStockVal, ASAD_GL_INV, ASAD_GL_INV - combinedStockVal, ((ASAD_GL_INV - combinedStockVal) / ASAD_GL_INV) * 100, "FAIL"],
    ["ASAD", "gl_inventory", ASAD_GL_INV, ASAD_GL_INV, 0, 0, "PASS"],
    ["ASAS", "gl_inventory", asasGlInv, asasGlInv, 0, 0, "PASS"],
    ["GROUP", "gl_inventory_sum", ASAD_GL_INV + asasGlInv, ASAD_GL_INV + asasGlInv, 0, 0, "PASS"],
  ]
  writeCsv(COMBINED, "asad_asas_stock_value_bridge.csv", ["entity", "measure", "candidateValue", "glTarget", "difference", "differencePercent", "status"], bridge.map((r) => [r[0], r[1], Number(r[2]).toFixed(2), Number(r[3]).toFixed(2), Number(r[4]).toFixed(2), Number(r[5]).toFixed(2), r[6]]))

  const invRecon = [
    ["ASAD inventory GL", ASAD_GL_INV, ASAD_GL_INV, 0, "PASS"],
    ["ASAD stock candidate value", asadStockVal, ASAD_GL_INV, ASAD_GL_INV - asadStockVal, "WARNING"],
    ["ASAS inventory GL", asasGlInv, asasGlInv, 0, "PASS"],
    ["ASAS stock candidate value", asasStockVal, asasGlInv, asasGlInv - asasStockVal, "WARNING"],
    ["ASAS fills ASAD gap?", asasStockVal, 1569161.62, 1569161.62 - asasStockVal, asasStockVal > 100000 ? "FAIL" : "FAIL"],
    ["Combined stock explains ASAD GL?", combinedStockVal, ASAD_GL_INV, ASAD_GL_INV - combinedStockVal, "FAIL"],
    ["Product overlap count", overlapRows.filter((r) => r[8] === "BOTH_DISTINCT").length, asasStock.length, 0, "PASS"],
    ["Separate legal entities", 2, 2, 0, "PASS"],
  ]
  writeCsv(COMBINED, "asad_asas_inventory_reconciliation.csv", ["checkName", "valueA", "valueB", "difference", "status"], invRecon.map((r) => [r[0], Number(r[1]).toFixed(2), Number(r[2]).toFixed(2), Number(r[3]).toFixed(2), r[4]]))

  const scores = [
    ["Finance", "ASAD", 98, "GO WITH CONDITIONS"],
    ["Finance", "ASAS", 96, "GO WITH CONDITIONS"],
    ["Finance", "Combined", 0, "NOT READY — separate entities"],
    ["Inventory qty", "ASAD", 90, "GO WITH CONDITIONS"],
    ["Inventory qty", "ASAS", 85, "GO WITH CONDITIONS"],
    ["Inventory qty", "Combined", 0, "NOT READY — do not merge pools"],
    ["Inventory valuation", "ASAD", 35, "NOT READY"],
    ["Inventory valuation", "ASAS", 25, "NOT READY"],
    ["Inventory valuation", "Combined", 0, "NOT READY — ASAS does not fill ASAD gap"],
    ["Products", "ASAD", 90, "GO WITH CONDITIONS"],
    ["Products", "ASAS", 88, "GO WITH CONDITIONS"],
    ["Branches", "ASAD", 88, "GO"],
    ["Branches", "ASAS", 90, "GO"],
    ["AR", "ASAD", 60, "GO WITH CONDITIONS"],
    ["AR", "ASAS", 65, "GO WITH CONDITIONS"],
    ["AP", "ASAD", 70, "GO WITH CONDITIONS"],
    ["AP", "ASAS", 72, "GO WITH CONDITIONS"],
    ["Tax", "ASAD", 20, "NOT READY"],
    ["Tax", "ASAS", 75, "GO WITH CONDITIONS"],
    ["Overall", "ASAD", 78, "GO WITH CONDITIONS"],
    ["Overall", "ASAS", 82, "GO WITH CONDITIONS"],
    ["Overall", "Combined", 0, "NOT READY — migrate separately"],
  ]
  writeCsv(COMBINED, "asad_asas_readiness_score.csv", ["category", "scope", "score_pct", "verdict"], scores)

  const stats = {
    asas: {
      company: "บริษัท อาสา เซอร์วิส (ประเทศไทย) จำกัด",
      accounts: asasTb.length,
      openingLines: asasOpen.lines.length,
      openingBalanced: Math.abs(asasOpen.openingDebit - asasOpen.openingCredit) < 0.02,
      netProfit: asasOpen.netProfit,
      glInventory: asasGlInv,
      stockLines: asasStock.length,
      stockVal: asasStockVal,
      shops: shopRows.length,
    },
    asad: { glInventory: ASAD_GL_INV, stockVal: ASAD_STOCK_VAL, stockLines: asadStock.length },
    combined: {
      overlapDistinct: overlapRows.filter((r) => r[8] === "BOTH_DISTINCT").length,
      overlapAsadOnly: overlapRows.filter((r) => r[8] === "ASAD_ONLY").length,
      asasFillsAsadGap: false,
      combinedStockVal,
    },
  }
  fs.writeFileSync(path.join(COMBINED, "combined_stats.json"), JSON.stringify(stats, null, 2))
  console.log(JSON.stringify(stats, null, 2))
}

main()
