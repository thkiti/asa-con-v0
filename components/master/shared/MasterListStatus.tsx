import { masterEmptyState, masterShellNote } from "@/lib/master-ui/table-classes"

type MasterListStatusProps = {
  loading: boolean
  error: string | null
  count: number
}

export function MasterListStatus({ loading, error, count }: MasterListStatusProps) {
  if (error) {
    return (
      <p className={`${masterShellNote} border-destructive/40 text-destructive`} role="alert">
        {error}
      </p>
    )
  }

  if (loading) {
    return <p className={masterEmptyState}>Loading…</p>
  }

  return <p className="py-2 text-xs text-muted-foreground">{count} row(s)</p>
}
