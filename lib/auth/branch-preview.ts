import { prisma } from "@/lib/shared/prisma"

import {
  rejectLoginPreviewNotFound,
  type BranchPreview,
} from "./login-preview"

export async function previewBranchByCode(
  branchCodeInput: string
): Promise<BranchPreview> {
  const branchCode = branchCodeInput.trim()
  if (!branchCode) {
    rejectLoginPreviewNotFound()
  }

  const branch = await prisma.branch.findUnique({
    where: { code: branchCode },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      deleted: true,
    },
  })

  if (!branch || branch.deleted || !branch.isActive) {
    rejectLoginPreviewNotFound()
  }

  return {
    branchId: branch.id,
    branchCode: branch.code,
    branchName: branch.name,
  }
}
