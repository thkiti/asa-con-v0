/** Epson TM-U220 class 80mm thermal — printable text column budget. */
export { THERMAL_COLUMNS } from "./format"
export const THERMAL_PAPER_WIDTH_MM = 80

/** Safe printable content width inside side margins. */
export const THERMAL_PRINTABLE_WIDTH_MM = 72

/** Side inset per edge: (paper − printable) / 2. */
export const THERMAL_PAPER_SIDE_INSET_MM =
  (THERMAL_PAPER_WIDTH_MM - THERMAL_PRINTABLE_WIDTH_MM) / 2

export const THERMAL_PAPER_WIDTH_CSS = `${THERMAL_PAPER_WIDTH_MM}mm`
export const THERMAL_PRINTABLE_WIDTH_CSS = `${THERMAL_PRINTABLE_WIDTH_MM}mm`
export const THERMAL_PAPER_SIDE_INSET_CSS = `${THERMAL_PAPER_SIDE_INSET_MM}mm`

export const THERMAL_PAPER_CSS_VAR = "--thermal-paper-width"
export const THERMAL_PRINTABLE_CSS_VAR = "--thermal-printable-width"
export const THERMAL_PAPER_PADDING_CSS_VAR = "--thermal-paper-padding"

export const THERMAL_PAPER_CSS_VARS = {
  [THERMAL_PAPER_CSS_VAR]: THERMAL_PAPER_WIDTH_CSS,
  [THERMAL_PRINTABLE_CSS_VAR]: THERMAL_PRINTABLE_WIDTH_CSS,
  [THERMAL_PAPER_PADDING_CSS_VAR]: THERMAL_PAPER_SIDE_INSET_CSS,
} as const

/**
 * Print-only driver scale compensation (Chrome + XP-Q807K / current Windows thermal driver).
 * CSS @page mm sizing is wider than the driver's effective printable width; tune here if
 * Chrome print preview only fits at a different manual scale (e.g. 91% → use 0.91).
 * Not applied to on-screen preview.
 */
export const THERMAL_PRINT_SCALE = 0.91

export const THERMAL_PRINT_SCALE_CSS_VAR = "--thermal-print-scale"

/** Paper width after {@link THERMAL_PRINT_SCALE} — wrapper size for print clone. */
export const THERMAL_PRINT_SCALED_PAPER_WIDTH_MM =
  THERMAL_PAPER_WIDTH_MM * THERMAL_PRINT_SCALE

export const THERMAL_PRINT_SCALED_PAPER_WIDTH_CSS = `${THERMAL_PRINT_SCALED_PAPER_WIDTH_MM}mm`
