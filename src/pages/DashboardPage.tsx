import { Building2, Check, Settings2 } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { BookingSettings } from '../features/schedulers/BookingSettings'
import type { Tenant } from '../lib/schemas'

export function DashboardPage() {
  const tenant = useOutletContext<Tenant>()
  return <><p className="eyebrow">PANEL DE ADMINISTRACIÓN</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{tenant.name}</h1><p className="mt-3 text-slate-500">Administrá la configuración de tu empresa.</p><div className="mt-9 grid gap-5 sm:grid-cols-3">{[
    { icon: Building2, title: 'Empresa activa', value: tenant.slug },
    { icon: Settings2, title: 'Zona horaria', value: tenant.timezone },
    { icon: Check, title: 'Tu acceso', value: tenant.role },
  ].map(({ icon: Icon, title, value }) => <div className="card" key={title}><Icon className="mb-5 text-teal-700" size={24} /><h2 className="text-sm text-slate-500">{title}</h2><p className="mt-2 break-words font-semibold">{value}</p></div>)}</div><div className="mt-8 rounded-2xl border border-teal-200 bg-teal-50 p-6"><h2 className="font-semibold text-teal-900">Sesión y empresa configuradas</h2><p className="mt-2 text-sm leading-relaxed text-teal-800">Usá la navegación para administrar sucursales, servicios y profesionales, y configurar sus horarios laborales.</p></div><BookingSettings /><div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6"><div><h2 className="font-semibold">Tu página de reservas online</h2><p className="mt-2 text-sm text-slate-500">Compartí este enlace con tus clientes. La sucursal debe tener una agenda activa y profesionales con servicios y horarios asignados.</p><p className="mt-2 break-all text-xs text-teal-800">{window.location.origin}/{tenant.slug}/reservar</p></div><Link className="btn-primary" to={`/${encodeURIComponent(tenant.slug)}/reservar`} target="_blank" rel="noopener noreferrer">Ver página de reservas</Link></div></>
}
