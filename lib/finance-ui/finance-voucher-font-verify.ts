import { FINANCE_VOUCHER_PRINT_FONT_NAME } from "@/lib/finance-ui/finance-voucher-print-font"

export type FinanceVoucherFontVerification = {
  sheetSelector: string
  computedFontFamily: string | null
  rootComputedFontFamily: string | null
  fontsCheckRegular: boolean | null
  fontsCheckBold: boolean | null
  fontsApiAvailable: boolean
  /** True when computed stack includes THSarabunNew or next/font financeVoucherLocalFont. */
  stackNamesExpectedFont: boolean
  /** Primary family name from computed stack (first entry). */
  primaryComputedFamily: string | null
}

const SHEET_SELECTOR = `[data-finance-print-font="${FINANCE_VOUCHER_PRINT_FONT_NAME}"]`

function stackNamesExpectedFont(family: string | null): boolean {
  if (!family) return false
  const lower = family.toLowerCase()
  return (
    lower.includes(FINANCE_VOUCHER_PRINT_FONT_NAME.toLowerCase()) ||
    lower.includes("thsarabun") ||
    lower.includes("sarabun") ||
    lower.includes("financevoucherlocalfont")
  )
}

function primaryComputedFamily(family: string | null): string | null {
  if (!family) return null
  const first = family.split(",")[0]?.trim().replace(/^["']|["']$/g, "")
  return first || null
}

/** Read browser font state for finance voucher sheet (client only). */
export function verifyFinanceVoucherFont(): FinanceVoucherFontVerification {
  if (typeof document === "undefined") {
    return {
      sheetSelector: SHEET_SELECTOR,
      computedFontFamily: null,
      rootComputedFontFamily: null,
      fontsCheckRegular: null,
      fontsCheckBold: null,
      fontsApiAvailable: false,
      stackNamesExpectedFont: false,
      primaryComputedFamily: null,
    }
  }

  const sheet = document.querySelector(SHEET_SELECTOR)
  const root = document.querySelector(".finance-voucher-print-root")
  const computedFontFamily = sheet ? getComputedStyle(sheet).fontFamily : null
  const rootComputedFontFamily = root ? getComputedStyle(root).fontFamily : null
  const effectiveFamily = computedFontFamily ?? rootComputedFontFamily
  const probeFamily = effectiveFamily ?? FINANCE_VOUCHER_PRINT_FONT_NAME

  const fontsApiAvailable = typeof document.fonts?.check === "function"
  const fontsCheckRegular = fontsApiAvailable
    ? document.fonts.check(`16px ${probeFamily}`)
    : null
  const fontsCheckBold = fontsApiAvailable
    ? document.fonts.check(`bold 16px ${probeFamily}`)
    : null

  return {
    sheetSelector: SHEET_SELECTOR,
    computedFontFamily,
    rootComputedFontFamily,
    fontsCheckRegular,
    fontsCheckBold,
    fontsApiAvailable,
    stackNamesExpectedFont: stackNamesExpectedFont(effectiveFamily),
    primaryComputedFamily: primaryComputedFamily(effectiveFamily),
  }
}

/** Ensure voucher fonts are loaded before browser print (client only). */
export async function ensureFinanceVoucherFontsLoaded(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.load) return

  const sheet = document.querySelector(SHEET_SELECTOR)
  const root = document.querySelector(".finance-voucher-print-root")
  const family =
    (sheet && getComputedStyle(sheet).fontFamily) ||
    (root && getComputedStyle(root).fontFamily) ||
    `"${FINANCE_VOUCHER_PRINT_FONT_NAME}"`

  await Promise.allSettled([
    document.fonts.load(`16px ${family}`),
    document.fonts.load(`bold 16px ${family}`),
    document.fonts.ready,
  ])
}
