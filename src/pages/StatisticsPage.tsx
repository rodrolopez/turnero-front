import { FinanceNavigation } from '../features/finance/FinanceNavigation'
import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { addDays, format, parseISO } from 'date-fns'
import type { Tenant } from '../lib/schemas'
import { useAuthStore } from '../stores/useAuthStore'
import { dateInZone } from '../features/booking/utils'
import { branchesResource, servicesResource, professionalsResource, useCatalog } from '../features/catalog/api'
import { filtersSchema, useStatistics, type StatisticsFilters } from '../features/statistics/api'
import { BookingHeatmap, RankingTable, ServiceWeekdays, weekdays } from '../features/statistics/Charts'
import { money } from '../features/finance/utils'
import { Field } from '../components/Field'
import { Button } from '../components/ui/Button'
import { CardsSkeleton } from '../components/ui/Skeleton'
import { QueryError } from '../components/ui/QueryState'
import { ErrorMessage } from '../components/Feedback'
import { DataTable } from '../components/ui/DataTable'

export default function StatisticsPage() {
  const role = useAuthStore((state) => state.tenantRole)
  return role === 'OWNER' ? <div className="space-y-6"><FinanceNavigation /><OwnerStatistics /></div> : <p>Estadísticas está disponible sólo para el propietario.</p>
}
function variation(current: number, previous: number) {
  if (!previous) return current ? 'Sin base previa para calcular variación' : 'Sin actividad en ambos períodos'
  const percent = (current - previous) / previous * 100
  return `${percent > 0 ? '+' : ''}${percent.toLocaleString('es-AR', { maximumFractionDigits: 1 })}% frente al período anterior`
}
function OwnerStatistics() {
  const tenant = useOutletContext<Tenant>()
  const [filters, setFilters] = useState<StatisticsFilters>(() => {
    const today = dateInZone(tenant.timezone)
    return { startDate: format(addDays(parseISO(today), -29), 'yyyy-MM-dd'), endDate: today, branchId: '', professionalId: '', serviceId: '' }
  })
  const [draft, setDraft] = useState(filters)
  const [error, setError] = useState('')
  const branches = useCatalog(branchesResource), services = useCatalog(servicesResource), professionals = useCatalog(professionalsResource)
  const query = useStatistics(filters)
  const data = query.data
  const optionError = [branches, services, professionals].find((result) => result.isError)
  const optionsLoading = branches.isPending || services.isPending || professionals.isPending
  return <div className="space-y-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">ANÁLISIS DEL NEGOCIO</p><h1 className="mt-3 text-3xl font-semibold">Estadísticas</h1><p className="mt-2 text-sm text-slate-500">Ventas, trabajo realizado y momentos en que tus clientes reservan en {tenant.name}.</p></div><Button busy={query.isFetching} onClick={() => void query.refetch()}>Actualizar</Button></div>
    <form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5" onSubmit={(event) => { event.preventDefault(); const parsed = filtersSchema.safeParse(draft); if (!parsed.success) { setError(parsed.error.issues[0].message); return }; setError(''); setFilters(parsed.data) }}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Field label="Desde" type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /><Field label="Hasta" type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} />
      {([{ key: 'branchId', label: 'Sucursal', rows: branches.data?.map((item) => ({ id: item.id, name: item.name, active: item.is_active })) }, { key: 'professionalId', label: 'Profesional', rows: professionals.data?.map((item) => ({ id: item.id, name: item.display_name, active: item.is_active })) }, { key: 'serviceId', label: 'Servicio', rows: services.data?.map((item) => ({ id: item.id, name: item.name, active: item.is_active })) }] as const).map((field) => <label key={field.key} className="text-sm font-medium">{field.label}<select className="input mt-1.5" value={draft[field.key]} disabled={optionsLoading || Boolean(optionError)} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}><option value="">Todos</option>{field.rows?.map((row) => <option key={row.id} value={row.id}>{row.name}{row.active ? '' : ' (inactivo)'}</option>)}</select></label>)}
    </div><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Hasta 366 días. Incluye registros inactivos para consultar su historial.</p><Button variant="primary" type="submit">Aplicar filtros</Button></div><ErrorMessage message={error} />{optionError && <QueryError error={optionError.error} retry={() => { void branches.refetch(); void services.refetch(); void professionals.refetch() }} />}</form>
    {query.isPending ? <CardsSkeleton count={6} label="Cargando estadísticas…" /> : query.isError ? <QueryError error={query.error} retry={() => void query.refetch()} /> : data && <>
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900"><strong>{filters.startDate} al {filters.endDate}</strong> · Zona horaria: {data.timezone}. Comparación: {data.previous.startDate} al {data.previous.endDate}. {query.isFetching && <span role="status">Actualizando…</span>}</div>
      <section aria-label="Indicadores del período" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
        { label: 'Servicios realizados y cobrados', value: String(data.summary.services), note: variation(data.summary.services, data.previous.services) },
        { label: 'Facturación por fecha de atención', value: money(data.summary.revenue), note: 'Precio histórico de los servicios realizados; excluye anulaciones.' },
        { label: 'Ingresos por fecha de cobro', value: money(data.summary.cashRevenue), note: 'Cobros vigentes de los servicios filtrados, por fecha de pago. Incluye efectivo y Mercado Pago.' },
        { label: 'Reservas creadas', value: String(data.summary.reservations), note: variation(data.summary.reservations, data.previous.reservations) },
        { label: 'Reservas online creadas', value: String(data.summary.webReservations), note: variation(data.summary.webReservations, data.previous.webReservations) },
        { label: 'Día con más servicios', value: data.weekdays.some((day) => day.quantity) ? weekdays[[...data.weekdays].sort((a, b) => b.quantity - a.quantity || a.weekday - b.weekday)[0].weekday - 1] : 'Sin actividad', note: 'Según la fecha de atención. Si hay empate, se muestra el primero de la semana.' },
      ].map((metric) => <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-sm text-slate-500">{metric.label}</h2><p className="mt-3 break-words text-2xl font-semibold text-teal-900">{metric.value}</p><p className="mt-2 text-xs leading-relaxed text-slate-500">{metric.note}</p></article>)}</section>
      <BookingHeatmap cells={data.bookingHeatmap} />
      <div className="grid gap-8 xl:grid-cols-2"><RankingTable title="Servicios" rows={data.services} /><RankingTable title="Profesionales" rows={data.professionals} /></div>
      <p className="text-xs text-slate-500">Los rankings incluyen ceros. La cantidad de servicios no mide productividad por hora: no ajusta por jornadas ni días trabajados. La facturación por profesional es el bruto de sus servicios, no su ganancia personal.</p>
      <ServiceWeekdays report={data} />
      <section className="space-y-4"><h2 className="text-xl font-semibold">Evolución diaria</h2><p className="text-sm text-slate-500">La reserva se cuenta en la fecha en que se creó; la venta, en la fecha del servicio; el ingreso, en la fecha del cobro. Esas fechas pueden ser distintas.</p><DataTable rows={data.daily.map((day) => ({ ...day, id: day.date }))} empty="No hay datos para el período." columns={[
        { title: 'Fecha', render: (day) => day.date }, { title: 'Reservas creadas', render: (day) => day.reservations }, { title: 'Online', render: (day) => day.webReservations },
        { title: 'Servicios', render: (day) => day.quantity }, { title: 'Facturado por atención', render: (day) => money(day.revenue) }, { title: 'Cobrado', render: (day) => money(day.cashRevenue) },
      ]} /></section>
    </>}
  </div>
}
