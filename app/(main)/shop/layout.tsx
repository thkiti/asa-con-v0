/** Shop area — terminal at `/shop` is full viewport; stock-doc pages add their own padding. */
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen">{children}</div>
}
