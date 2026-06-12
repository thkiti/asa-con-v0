"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { patchDocumentEntity } from "@/lib/auth/login-client"
import {
  canChooseDocumentEntity,
  getLegalEntityDisplayName,
  type DocumentEntityCode,
} from "@/lib/legal-entity"
import { themeMuted } from "@/lib/theme/theme-classes"

type SessionEntityControlProps = {
  user: SessionUserApi
}

export function SessionEntityControl({ user }: SessionEntityControlProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const canToggle = canChooseDocumentEntity(user.role, user.branchCode)
  const displayName = getLegalEntityDisplayName(user.documentEntityCode)

  const onSelect = useCallback(
    async (code: DocumentEntityCode) => {
      if (code === user.documentEntityCode || pending) return
      setPending(true)
      try {
        await patchDocumentEntity(code)
        router.refresh()
      } finally {
        setPending(false)
      }
    },
    [pending, router, user.documentEntityCode]
  )

  return (
    <div className="mt-1" data-testid="session-entity-control">
      <p className="text-card-foreground">
        <span className={themeMuted}>Entity: </span>
        <span
          className="font-medium"
          data-testid="session-entity-label"
        >
          {displayName}
        </span>
      </p>
      {canToggle ? (
        <div
          className="mt-1 flex gap-3 text-sm"
          data-testid="session-entity-toggle"
        >
          <label className="inline-flex cursor-pointer items-center gap-1">
            <input
              type="radio"
              name="sessionDocumentEntity"
              value="AS"
              checked={user.documentEntityCode === "AS"}
              onChange={() => void onSelect("AS")}
              disabled={pending}
            />
            <span>ASAS</span>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1">
            <input
              type="radio"
              name="sessionDocumentEntity"
              value="AD"
              checked={user.documentEntityCode === "AD"}
              onChange={() => void onSelect("AD")}
              disabled={pending}
            />
            <span>ASAD</span>
          </label>
        </div>
      ) : null}
    </div>
  )
}
