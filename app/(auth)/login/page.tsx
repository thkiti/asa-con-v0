import { Suspense } from "react"

import { LoginForm } from "@/components/auth/LoginForm"
import { themeMuted, themePage } from "@/lib/theme/theme-classes"

export default function LoginPage() {
  return (
    <main className={`p-8 ${themePage}`}>
      <Suspense
        fallback={<p className={`text-sm ${themeMuted}`}>กำลังโหลด...</p>}
      >
        <LoginForm />
      </Suspense>
    </main>
  )
}
