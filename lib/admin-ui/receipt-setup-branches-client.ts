import type { BranchListItem } from "@/lib/master/types"
import {
  mapBranchesForReceiptSetupPreview,
  pickCompanyTaxIdFromBranches,
  type ReceiptSetupBranchOption,
} from "@/lib/admin-ui/receipt-setup-preview"

async function readJsonBody<T>(res: Response): Promise<T> {
  const payload = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(payload.error ?? `Request failed (${res.status})`)
  }
  return payload
}

export type ReceiptSetupBranchesResult =
  | { ok: true; branches: ReceiptSetupBranchOption[]; companyTaxId: string | null }
  | { ok: false; error: string }

export async function fetchReceiptSetupBranches(): Promise<ReceiptSetupBranchesResult> {
  try {
    const payload = await readJsonBody<{ items: BranchListItem[] }>(
      await fetch("/api/master/branches", { cache: "no-store" })
    )
    const branches = mapBranchesForReceiptSetupPreview(payload.items)
    return {
      ok: true,
      branches,
      companyTaxId: pickCompanyTaxIdFromBranches(branches),
    }
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load branches",
    }
  }
}
