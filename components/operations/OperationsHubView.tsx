"use client"

import type { SessionUserApi } from "@/lib/auth/session-user-api"
import type { MainMenuSectionDetail } from "@/lib/main-ui/main-menu"
import { themeMuted } from "@/lib/theme/theme-classes"
import { MainMenuShell } from "@/components/main/MainMenuShell"
import { OperationsHubMenu } from "./OperationsHubMenu"

type OperationsHubViewProps = {
  user: SessionUserApi
  section: MainMenuSectionDetail
}

export function OperationsHubView({ user, section }: OperationsHubViewProps) {
  return (
    <MainMenuShell
      user={user}
      title={section.label}
      backHref="/main"
      backLabel="← Back to Main Menu"
    >
      <p className={`mt-6 text-sm ${themeMuted}`}>{section.description}</p>
      <OperationsHubMenu section={section} />
    </MainMenuShell>
  )
}
