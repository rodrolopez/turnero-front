import { StaffAgendaPage } from './StaffAgendaPage'
import { useAuthStore } from '../stores/useAuthStore'
import { CheckoutModal } from '../features/finance/CheckoutModal'
import { WalkInModal } from '../features/finance/WalkInModal'
import { money } from '../features/finance/utils'
import { displayStatus } from '../features/agenda/utils'
import { useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { addDays, format, parseISO } from 'date-fns'
import { isAxiosError } from 'axios'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import type { Tenant } from '../lib/schemas'
import { useCatalog, branchesResource } from '../features/catalog/api'
import { useAgenda, useAgendaAction } from '../features/agenda/api'
import { agendaRange, type AgendaView } from '../features/agenda/utils'
import type { AgendaAction, AgendaAppointment } from '../features/agenda/schemas'
import { TimeGrid } from '../features/agenda/TimeGrid'
import { useAgendaProfessionals } from '../features/agenda/useAgendaProfessionals'
import { colorByProfessional, mergeGridProfessionals } from '../features/agenda/timeGrid'
import { AppointmentCard } from '../features/agenda/AppointmentCard'
import { dateInZone, readableDate, timeInZone } from '../features/booking/utils'
import { Field } from '../components/Field'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { QueryError } from '../components/ui/QueryState'
import { TimeGridSkeleton } from '../features/agenda/TimeGridSkeleton'
import { ErrorMessage } from '../components/Feedback'
import { getErrorMessage } from '../api/client'

export default function AgendaPage() {
  const role = useAuthStore((state) => state.tenantRole)
  if (role === 'STAFF') return <StaffAgendaPage />
  if (role !== 'OWNER' && role !== 'ADMIN') return null
  return <ManagementAgendaPage />
}

function ManagementAgendaPage() {
  const tenant = useOutletContext<Tenant>()
  const role = useAuthStore((state) => state.tenantRole)
  const canCharge = role === 'OWNER' || role === 'ADMIN'
  const [checkout, setCheckout] = useState<AgendaAppointment | null>(null)
  const [walkIn, setWalkIn] = useState(false)
  const branches = useCatalog(branchesResource)
  const [branchId, setBranchId] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const professionals = useAgendaProfessionals(branchId)
  const [date, setDate] = useState(() => dateInZone(tenant.timezone))
  const [view, setView] = useState<AgendaView>('day')
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<{ appointment: AgendaAppointment; action: AgendaAction | null } | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const sending = useRef(false)
  const range = agendaRange(date, view)
  const query = useAgenda(range ? { branchId, startDate: range.startDate, endDate: range.endDate, limit: 100, offset } : null)
  const mutation = useAgendaAction(tenant.slug)
  const timezone = branches.data?.find((branch) => branch.id === branchId)?.timezone ?? tenant.timezone
  function changeDate(value: string) { setDate(value); setOffset(0); setNotice(''); setError('') }
  function openAction(appointment: AgendaAppointment, action: AgendaAction) { mutation.reset(); setError(''); setNotice(''); setSelected({ appointment, action }) }
  function openDetails(appointment: AgendaAppointment) { mutation.reset(); setError(''); setSelected({ appointment, action: null }) }
  async function execute() {
    if (!selected?.action || sending.current) return
    sending.current = true
    try {
      await mutation.mutateAsync({ id: selected.appointment.id, action: selected.action })
      setNotice(selected.action === 'confirm' ? 'Turno confirmado. La agenda está actualizada.' : 'Turno cancelado. El horario quedó liberado.')
      setSelected(null)
    } catch (failure) {
      if (isAxiosError(failure) && (failure.response?.status === 409 || failure.response?.status === 404)) {
        setError(getErrorMessage(failure)); setSelected(null)
      }
    } finally { sending.current = false }
  }
  const page = query.data
  const selectedProfessional = professionals.catalog.find((professional) => professional.id === professionalId)
  const options = mergeGridProfessionals([
    ...professionals.assigned,
    ...(selectedProfessional ? [{ id: selectedProfessional.id, name: selectedProfessional.display_name }] : []),
  ], page?.appointments ?? [])
  const colors = colorByProfessional([
    ...professionals.catalog.map((professional) => professional.id),
    ...options.map((professional) => professional.id),
  ])
  const selectedAppointment = page?.appointments.find((appointment) => appointment.id === selected?.appointment.id) ?? selected?.appointment
  const visibleCount = page?.appointments.filter((appointment) => !professionalId || appointment.items.some((item) => item.professionalId === professionalId)).length ?? 0
  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">GESTIÓN DE TURNOS</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Agenda</h1><p className="mt-2 text-sm text-slate-500">Organizá las visitas y gestioná las reservas de {tenant.name}.</p></div><div className="flex flex-wrap gap-3">{canCharge && <Button variant="primary" onClick={() => setWalkIn(true)}>Nuevo Turno Directo (Walk-in)</Button>}<Button onClick={() => void query.refetch()} busy={query.isFetching} disabled={!range}><RefreshCw size={16} />Actualizar</Button></div></div>
    {notice && <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">{notice}</p>}<ErrorMessage message={error} />
    <section aria-label="Filtros de agenda" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-end gap-4"><div className="min-w-48 flex-1"><label htmlFor="agenda-branch" className="mb-1.5 block text-sm font-medium">Sucursal</label><select id="agenda-branch" className="input" value={branchId} onChange={(event) => { setBranchId(event.target.value); setProfessionalId(''); setOffset(0) }} disabled={branches.isPending || branches.isError}><option value="">Todas las sucursales</option>{branches.data?.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.is_active ? '' : ' (inactiva)'}</option>)}</select></div><div className="min-w-48 flex-1"><label htmlFor="agenda-professional" className="mb-1.5 block text-sm font-medium">Profesional</label><select id="agenda-professional" className="input" value={professionalId} onChange={(event) => setProfessionalId(event.target.value)} disabled={professionals.isPending || Boolean(professionals.error)}><option value="">Todos los profesionales</option>{options.map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}</select></div><Field label="Fecha de referencia" type="date" value={date} onChange={(event) => changeDate(event.target.value)} error={!range ? 'Elegí una fecha válida' : undefined} /><div><p className="mb-1.5 text-sm font-medium">Vista</p><div className="flex gap-1 rounded-xl border border-slate-200 p-1">{([{ value: 'day', label: 'Día' }, { value: 'week', label: 'Semana' }] as const).map((item) => <button type="button" key={item.value} aria-pressed={view === item.value} onClick={() => { setView(item.value); setOffset(0) }} className={`rounded-lg px-4 py-2 text-sm font-medium ${view === item.value ? 'bg-teal-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{item.label}</button>)}</div></div></div>
      {branches.isError && <div className="mt-4"><QueryError error={branches.error} retry={() => void branches.refetch()} /></div>}
      {professionals.error && <div className="mt-4"><QueryError error={professionals.error} retry={professionals.refetch} /></div>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><div className="flex items-center gap-2"><Button disabled={!range} aria-label={view === 'day' ? 'Día anterior' : 'Semana anterior'} onClick={() => changeDate(format(addDays(parseISO(date), view === 'day' ? -1 : -7), 'yyyy-MM-dd'))}><ChevronLeft size={16} /></Button><Button onClick={() => changeDate(dateInZone(timezone))}>Hoy</Button><Button disabled={!range} aria-label={view === 'day' ? 'Día siguiente' : 'Semana siguiente'} onClick={() => changeDate(format(addDays(parseISO(date), view === 'day' ? 1 : 7), 'yyyy-MM-dd'))}><ChevronRight size={16} /></Button></div><p className="text-xs text-slate-500">Cada turno muestra la hora local de su sucursal. Se actualiza cada 30 segundos.</p></div>
    </section>
    {!range ? <p className="text-sm text-slate-500">Seleccioná una fecha para consultar la agenda.</p> : query.isPending ? <TimeGridSkeleton columns={view === 'week' ? 7 : professionalId ? 1 : options.length || 3} /> : query.isError ? <QueryError error={query.error} retry={() => void query.refetch()} /> : page && <><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-slate-700">{page.pagination.total} turnos · {range.startDate}{range.endDate !== range.startDate ? ` al ${range.endDate}` : ''}</p>{query.isFetching && <span role="status" className="text-xs text-slate-500">Actualizando…</span>}</div>
      <div aria-label="Colores por profesional" className="flex flex-wrap gap-x-4 gap-y-2">{options.filter((professional) => !professionalId || professional.id === professionalId).map((professional) => <span key={professional.id} className="inline-flex items-center gap-2 text-xs text-slate-600"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${colors.get(professional.id) ?? 'bg-blue-500'}`} />{professional.name}</span>)}</div>
      {(professionalId || page.pagination.total > page.appointments.length) && <p className="text-xs text-slate-500">{visibleCount} reservas visibles en esta página. Usá Anterior y Siguiente para recorrer los demás turnos.</p>}
      {professionals.isPending ? <TimeGridSkeleton columns={view === 'week' ? 7 : professionalId ? 1 : 3} label="Cargando profesionales…" /> : <TimeGrid appointments={page.appointments} days={range.days} view={view} professionals={options} professionalId={professionalId} colors={colors} onOpen={openDetails} />}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5"><p className="text-xs text-slate-500">{page.pagination.total ? `${offset + 1}–${Math.min(offset + page.appointments.length, page.pagination.total)}` : '0'} de {page.pagination.total} turnos</p><div className="flex gap-2"><Button disabled={offset === 0 || query.isFetching} onClick={() => setOffset((value) => Math.max(0, value - 100))}>Anterior</Button><Button disabled={offset + page.appointments.length >= page.pagination.total || query.isFetching} onClick={() => setOffset((value) => value + 100)}>Siguiente</Button></div></div>
    </>}
    {selected && selectedAppointment && <Modal title={selected.action === 'confirm' ? 'Confirmar reserva' : selected.action === 'cancel' ? 'Cancelar reserva' : 'Detalle del turno'} busy={mutation.isPending} onClose={() => setSelected(null)}>
      {selected.action ? <><p className="text-sm leading-relaxed text-slate-600">{selected.action === 'confirm' ? 'Vas a confirmar' : 'Vas a cancelar'} el turno de <strong>{selectedAppointment.customer.displayName}</strong> en {selectedAppointment.branch.name}, el {readableDate(dateInZone(selectedAppointment.branch.timezone, new Date(selectedAppointment.startsAt)))} a las {timeInZone(selectedAppointment.startsAt, selectedAppointment.branch.timezone)}.{selected.action === 'cancel' ? ' El horario quedará disponible para otras reservas.' : ''}</p><div className="mt-4"><ErrorMessage message={mutation.isError ? getErrorMessage(mutation.error) : undefined} /></div><div className="mt-6 flex justify-end gap-3"><Button disabled={mutation.isPending} onClick={() => { mutation.reset(); setSelected({ appointment: selectedAppointment, action: null }) }}>Volver al detalle</Button><Button variant={selected.action === 'confirm' ? 'primary' : 'danger'} busy={mutation.isPending} onClick={() => void execute()}>{selected.action === 'confirm' ? 'Confirmar turno' : 'Cancelar turno'}</Button></div></>
        : <><AppointmentCard appointment={selectedAppointment} disabled={mutation.isPending} onAction={(action) => openAction(selectedAppointment, action)} />{canCharge && selectedAppointment.paymentStatus !== 'paid' && ['pending', 'confirmed', 'completed'].includes(displayStatus(selectedAppointment)) && <div className="mt-4 flex justify-end"><Button variant="primary" onClick={() => { setCheckout(selectedAppointment); setSelected(null) }}>Cobrar</Button></div>}<p className="mt-4 break-all text-xs text-slate-400">Código de reserva: {selectedAppointment.id}</p></>}
    </Modal>}

    {checkout && canCharge && <CheckoutModal key={checkout.id} appointment={checkout} onClose={() => setCheckout(null)} onSaved={(receipt) => { setCheckout(null); setNotice(`Cobro registrado: ${money(receipt.totalAmount)}. Turno completado y pagado.`) }} />}
    {walkIn && canCharge && <WalkInModal initialBranch={branchId} onClose={() => setWalkIn(false)} onSaved={(receipt) => { setWalkIn(false); changeDate(dateInZone(timezone)); setNotice(`Turno directo registrado y cobrado: ${money(receipt.totalAmount)}.`) }} />}
  </div>
}
