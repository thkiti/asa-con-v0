import Link from "next/link"

export default function ShopPage() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Shop</h1>
      <p className="mt-2 text-zinc-600">Shop operations and stock documents.</p>
      <ul className="mt-6 space-y-2">
        <li>
          <Link
            href="/shop/stock-documents"
            className="font-medium text-zinc-900 underline-offset-2 hover:underline"
          >
            Stock documents
          </Link>
          <span className="ml-2 text-sm text-zinc-600">
            Transfers, performance, adjustments
          </span>
        </li>
      </ul>
    </main>
  )
}
