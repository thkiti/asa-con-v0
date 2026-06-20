/** Primary bundled finance voucher print font (see public/fonts/THSarabunNew.ttf). */
export const FINANCE_VOUCHER_PRINT_FONT_NAME = "THSarabunNew"

/** CSS font-family stack for finance voucher screen + browser print. */
export const FINANCE_VOUCHER_PRINT_FONT_STACK = `var(--font-finance-voucher, "${FINANCE_VOUCHER_PRINT_FONT_NAME}"), "Noto Sans Thai", sans-serif`

/** data-* attribute value for DevTools / dev probe verification. */
export const FINANCE_VOUCHER_PRINT_FONT_DATA_ATTR = FINANCE_VOUCHER_PRINT_FONT_NAME
