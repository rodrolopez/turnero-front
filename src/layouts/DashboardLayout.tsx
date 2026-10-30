import { useEffect } from 'react'
import { Building2, CalendarDays, LogOut } from 'lucide-react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useTenants } from '../api/tenants'
import { getErrorMessage } from '../api/client'
import { useAuthStore } from '../stores/useAuthStore'
import { ErrorMessage, Loading } from '../components/Feedback'

export function DashboardLayout() {
  const { pathname } = useLocation()
  const tenantId = useAuthStore((state) => state.tenantId)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const tenants = useTenants()
  const role = useAuthStore((state) => state.tenantRole)
  const setRole = useAuthStore((state) => state.setTenantRole)
  const tenant = tenants.data?.find((item) => item.id === tenantId)
  useEffect(() => { if (tenant) setRole(tenant.id, tenant.role) }, [tenant?.id, tenant?.role, setRole])
  if (tenants.isPending) return <Loading label="Verificando tu empresa…" />
  if (tenants.isError) return <div className="mx-auto max-w-lg p-8"><ErrorMessage message={getErrorMessage(tenants.error)} /><button className="btn-secondary mt-4" onClick={() => void tenants.refetch()}>Reintentar</button></div>
  if (!tenant) return <Navigate to="/tenants" replace />
  if (role !== tenant.role) return <Loading label="Verificando permisos…" />
  if (role !== 'OWNER' && (pathname === '/dashboard/finance/statistics' || pathname.startsWith('/dashboard/finance/statistics/'))) return <Navigate to="/dashboard/agenda" replace />
  const allowedPaths = role === 'STAFF' ? ['/dashboard/agenda', '/dashboard/finance']
    : role === 'ADMIN' ? ['/dashboard/agenda', '/dashboard/branches', '/dashboard/services', '/dashboard/professionals'] : null
  if (allowedPaths && pathname !== '/dashboard' && !allowedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return <Navigate to="/dashboard/agenda" replace />
  return <div className="min-h-screen bg-slate-50">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5"><Link to="/dashboard" className="flex items-center gap-2 text-xl font-bold"><CalendarDays className="text-teal-700" />Turnero.</Link><div className="flex flex-wrap items-center gap-4"><Link to="/tenants?switch=1" className="flex items-center gap-2 text-sm font-medium text-teal-800"><Building2 size={17} />{tenant.name}</Link><span className="text-sm text-slate-500">{user?.fullName}</span><button className="btn-secondary" onClick={logout}><LogOut size={16} />Salir</button></div></div></header>
    <nav aria-label="Administración" className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-6">{[
      { to: '/dashboard/agenda', label: 'Agenda' }, { to: '/dashboard/settings', label: 'Mi empresa' }, { to: '/dashboard/branches', label: 'Sucursales' },
      ...(role === 'OWNER' || role === 'STAFF' ? [{ to: '/dashboard/finance', label: 'Finanzas' }] : []),
      { to: '/dashboard/services', label: 'Servicios' }, { to: '/dashboard/professionals', label: 'Profesionales' },
    ].filter((item) => !allowedPaths || allowedPaths.includes(item.to)).map((item) => <NavLink key={item.to} to={item.to} end={item.to !== '/dashboard/finance'} className={({ isActive }) => `whitespace-nowrap border-b-2 px-4 py-4 text-sm font-medium ${isActive ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-teal-700'}`}>{item.label}</NavLink>)}</div></nav>
    <main key={tenant.id} className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"><Outlet context={tenant} /></main>
  </div>
}
