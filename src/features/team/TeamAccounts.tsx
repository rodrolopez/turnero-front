import { useTeam, roleLabels } from './api'
import { useAuthStore } from '../../stores/useAuthStore'
import { DataTable } from '../../components/ui/DataTable'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { QueryError } from '../../components/ui/QueryState'
export function TeamAccounts() {
  const role = useAuthStore((s) => s.tenantRole)
  return role === 'OWNER' ? <Accounts /> : null
}
function Accounts() {
  const query = useTeam()
  const columns = [
    { title: 'Nombre', render: (row: NonNullable<typeof query.data>[number]) => row.full_name },
    { title: 'Cuenta', render: (row: NonNullable<typeof query.data>[number]) => row.email },
    { title: 'Rol de acceso', render: (row: NonNullable<typeof query.data>[number]) => <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{roleLabels[row.role]}</span> },
    { title: 'Función', render: (row: NonNullable<typeof query.data>[number]) => row.has_professional ? 'Atiende servicios' : row.role === 'ADMIN' ? 'Administración · Sin contrato' : 'Cuenta de acceso' },
    { title: 'Estado', render: (row: NonNullable<typeof query.data>[number]) => ({ active: 'Activo', invited: 'Invitado', suspended: 'Suspendido' })[row.status] },
  ]
  return <section className="mt-10 space-y-4 border-t border-slate-200 pt-7"><h2 className="text-xl font-semibold">Cuentas y roles del local</h2><p className="text-sm text-slate-500">Permisos reales de las cuentas vinculadas a esta empresa. Los administradores gestionan el local y no atienden servicios.</p>{query.isPending ? <TableSkeleton columns={columns} label="Cargando cuentas del equipo…" /> : query.isError ? <QueryError error={query.error} retry={() => void query.refetch()} /> : <DataTable rows={query.data} columns={columns} empty="No hay cuentas vinculadas." />}</section>
}
