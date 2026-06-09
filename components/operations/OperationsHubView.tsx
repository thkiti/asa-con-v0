"use client"

import { MainMenuSectionView } from "@/components/main/MainMenuSectionView"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import type { MainMenuSectionDetail } from "@/lib/main-ui/main-menu"

type OperationsHubViewProps = {
  user: SessionUserApi
  section: MainMenuSectionDetail
}

export function OperationsHubView({ user, section }: OperationsHubViewProps) {
  return <MainMenuSectionView user={user} section={section} />
}
