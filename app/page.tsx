import Link from "next/link"

const areas = [
  { href: "/finance", label: "Finance" },
  { href: "/admin", label: "Admin" },
  { href: "/operations", label: "Operations" },
  { href: "/shop", label: "Shop" },
  { href: "/login", label: "Login" },
]

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">ASA-CON v0</h1>
      <p className="mt-2 text-zinc-600">Modular monolith scaffold — Phase 0.</p>
      <ul className="mt-6 flex flex-col gap-2">
        {areas.map((a) => (
          <li key={a.href}>
            <Link className="text-blue-600 underline" href={a.href}>
              {a.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}