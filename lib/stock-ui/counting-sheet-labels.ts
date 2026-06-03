import type { CountingHookGroup } from "./counting-hook-groups"

/** Thai labels for hook tabs — UI display only. */
export const COUNTING_HOOK_GROUP_LABELS_TH: Record<CountingHookGroup, string> = {
  K: "กุญแจบ้าน",
  C: "กุญแจรถ",
  M: "กุญแจมอเตอร์ไซค์",
  O: "กุญแจพิเศษอื่น",
  S: "วัสดุรองเท้า",
}

/** Thai shoe prefix section titles — keyed by prefix code. */
export const SHOE_PREFIX_SECTION_TITLES_TH: Record<string, string> = {
  "51": "51 ส้นแตะสตรี",
  "55": "55 พื้นรองเท้าสตรี",
  "61": "61 ส้นแตะชาย",
  "65": "65 พื้นรองเท้าชาย",
}

export const SHOE_OTHER_SECTION_TITLE_TH = "วัสดุรองเท้าอื่น"

export function shoeSectionTitleTh(prefix: string, fallback: string): string {
  return SHOE_PREFIX_SECTION_TITLES_TH[prefix] ?? fallback
}
