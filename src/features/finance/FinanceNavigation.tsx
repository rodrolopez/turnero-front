import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

/** OWNER's financial workspace. STAFF keeps its personal finance view. */
export function FinanceNavigation() {
  const role = useAuthStore((state) => state.tenantRole)
  if (role !== 'OWNER') return null
  return <nav aria-label="Secciones de Finanzas" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
    {[{ to: '/dashboard/finance', label: 'Gestión financiera' }, { to: '/dashboard/finance/statistics', label: 'Estadísticas' }].map((item) => <NavLink key={item.to} to={item.to} end className={({ isActive }) => `whitespace-nowrap rounded-xl px-4 py-3 text-sm font-medium ${isActive ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-teal-800'}`}>{item.label}</NavLink>)}
  </nav>
}
