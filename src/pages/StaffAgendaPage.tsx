import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { addDays, format, parseISO } from 'date-fns'
import type { Tenant } from '../lib/schemas'
import { useAgenda, useMyAgendaContext } from '../features/agenda/api'
import { agendaRange, type AgendaView } from '../features/agenda/utils'
import { colorByProfessional } from '../features/agenda/timeGrid'
import { dateInZone } from '../features/booking/utils'
import type { AgendaAppointment } from '../features/agenda/schemas'
import { TimeGrid } from '../features/agenda/TimeGrid'
import { TimeGridSkeleton } from '../features/agenda/TimeGridSkeleton'
import { AppointmentCard } from '../features/agenda/AppointmentCard'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { QueryError } from '../components/ui/QueryState'
import { Field } from '../components/Field'

export function StaffAgendaPage() {
  const tenant = useOutletContext<Tenant>()
  const context = useMyAgendaContext()
  const [date, setDate] = useState(() => dateInZone(tenant.timezone))
  const [view, setView] = useState<AgendaView>('day')
  const [branchId, setBranchId] = useState('')
  const [offset, setOffset] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const range = agendaRange(date, view)
  const query = useAgenda(range ? { branchId, startDate: range.startDate, endDate: range.endDate, limit: 100, offset } : null)
  const professionals = context.data?.professionals ?? []
  const page = query.data
  const selected: AgendaAppointment | undefined = page?.appointments.find((appointment) => appointment.id === selectedId)
  function changeDate(value: string) { setDate(value); setOffset(0); setSelectedId(null) }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">MI AGENDA</p><h1 className="mt-3 text-3xl font-semibold">Agenda</h1><p className="mt-2 text-sm text-slate-500">Consultá tus turnos en {tenant.name}. La gestión de reservas está a cargo de la administración.</p></div><Button busy={query.isFetching || context.isFetching} onClick={() => { void query.refetch(); void context.refetch() }}>Actualizar</Button></div>
    <section aria-label="Filtros de agenda personal" className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div><label htmlFor="staff-branch" className="mb-2 block text-sm font-medium">Sucursal</label><select id="staff-branch" className="input" value={branchId} onChange={(event) => { setBranchId(event.target.value); setOffset(0); setSelectedId(null) }}><option value="">Mis sucursales</option>{context.data?.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div>
      <Field label="Fecha de referencia" type="date" value={date} onChange={(event) => changeDate(event.target.value)} />
      <div className="flex gap-2">{(['day', 'week'] as const).map((value) => <Button key={value} variant={view === value ? 'primary' : 'secondary'} aria-pressed={view === value} onClick={() => { setView(value); setOffset(0); setSelectedId(null) }}>{value === 'day' ? 'Día' : 'Semana'}</Button>)}</div>
      <div className="flex gap-2"><Button disabled={!range} onClick={() => changeDate(format(addDays(parseISO(date), view === 'day' ? -1 : -7), 'yyyy-MM-dd'))}>Anterior fecha</Button><Button onClick={() => changeDate(dateInZone(tenant.timezone))}>Hoy</Button><Button disabled={!range} onClick={() => changeDate(format(addDays(parseISO(date), view === 'day' ? 1 : 7), 'yyyy-MM-dd'))}>Siguiente fecha</Button></div>
    </section>
    {context.isError ? <QueryError error={context.error} retry={() => void context.refetch()} /> : query.isError ? <QueryError error={query.error} retry={() => void query.refetch()} /> : !range ? <p>Elegí una fecha válida.</p> : query.isPending || context.isPending ? <TimeGridSkeleton columns={view === 'week' ? 7 : 1} /> : page && <>
      <p className="text-sm text-slate-600">{page.pagination.total} turnos personales · {range.startDate}{view === 'week' ? ` al ${range.endDate}` : ''}</p>
      {!professionals.length && <p className="text-sm text-slate-500">No tenés un perfil profesional vinculado en esta empresa. Contactá al dueño.</p>}
      <TimeGrid appointments={page.appointments} days={range.days} view={view} professionals={professionals} professionalId="" colors={colorByProfessional(professionals.map((professional) => professional.id))} onOpen={(appointment) => setSelectedId(appointment.id)} />
      <div className="flex justify-end gap-3"><Button disabled={!offset || query.isFetching} onClick={() => { setOffset(Math.max(0, offset - 100)); setSelectedId(null) }}>Anterior</Button><Button disabled={offset + page.appointments.length >= page.pagination.total || query.isFetching} onClick={() => { setOffset(offset + 100); setSelectedId(null) }}>Siguiente</Button></div>
    </>}
    {selected && <Modal title="Detalle del turno" onClose={() => setSelectedId(null)}><AppointmentCard appointment={selected} readOnly onAction={() => undefined} /></Modal>}
  </div>
}
