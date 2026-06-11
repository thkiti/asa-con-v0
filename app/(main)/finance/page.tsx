import { redirect } from "next/navigation"

/** Legacy finance home — canonical hub is /main/finance. */
export default function Page() {
  redirect("/main/finance")
}
