import { Suspense } from "react"

import { LoginForm } from "@/components/auth/LoginForm"

export default function LoginPage() {
  return (
    <main className="p-8">
      <Suspense fallback={<p className="text-sm text-zinc-600">กำลังโหลด...</p>}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
