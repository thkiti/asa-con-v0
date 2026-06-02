import {
  STAFF_IMPORT_LOGIN_NOTE,
  STAFF_IMPORT_NO_STAFF_WARNING,
} from "@/lib/system-ui/import-entity-config"
import type { StaffBootstrapStatusView } from "@/lib/system-ui/import-types"

type StaffImportNoticesProps = {
  staffBootstrap?: StaffBootstrapStatusView | null
}

export function StaffImportNotices({ staffBootstrap }: StaffImportNoticesProps) {
  return (
    <>
      <p className="mt-3 rounded border border-green-100 bg-green-50 p-3 text-sm text-green-900">
        {STAFF_IMPORT_LOGIN_NOTE}
      </p>
      {staffBootstrap && staffBootstrap.importedStaffCount === 0 ? (
        <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {STAFF_IMPORT_NO_STAFF_WARNING}
        </p>
      ) : null}
    </>
  )
}
