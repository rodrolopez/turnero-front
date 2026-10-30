import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { timeInZone, readableDate } from '../booking/utils'
import { displayStatus, statusLabels, type AgendaView } from './utils'
import type { AgendaAppointment } from './schemas'
import { buildTimeGridEvents, eventGeometry, GRID_PADDING, layoutOverlaps, PIXELS_PER_MINUTE, timeGridBounds, type GridProfessional } from './timeGrid'

interface Props {
  appointments: AgendaAppointment[]
  days: string[]
  view: AgendaView
  professionals: GridProfessional[]
  professionalId: string
  colors: Map<string, string>
  onOpen: (appointment: AgendaAppointment) => void
}
export function TimeGrid({ appointments, days, view, professionals, professionalId, colors, onOpen }: Props) {
  const events = buildTimeGridEvents(appointments, days, professionalId)
  const bounds = timeGridBounds(events)
  const columns = view === 'week' ? days.map((day) => ({ id: day, title: format(parseISO(day), 'EEE d/M', { locale: es }), label: readableDate(day), day, professional: '' }))
    : (professionalId ? professionals.filter((professional) => professional.id === professionalId) : professionals).map((professional) => ({ id: professional.id, title: professional.name, label: `Agenda de ${professional.name}`, day: days[0], professional: professional.id }))
  const visibleColumns = columns.length ? columns : [{ id: 'empty', title: 'Sin profesionales', label: 'Sin profesionales asignados', day: days[0], professional: '' }]
  const height = (bounds.endMinute - bounds.startMinute) * PIXELS_PER_MINUTE + GRID_PADDING * 2
  const ticks = Array.from({ length: (bounds.endMinute - bounds.startMinute) / 30 + 1 }, (_, index) => bounds.startMinute + index * 30)
  const hourLabel = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
  return <section aria-label="Grilla horaria de agenda" className="space-y-3">
    {!events.length && <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">No hay turnos para esta selección en esta página.</p>}
    <div role="region" aria-label="Calendario con desplazamiento horizontal y vertical" tabIndex={0} className="isolate max-h-[70vh] min-h-96 overflow-auto overscroll-contain rounded-2xl border border-slate-200 bg-white">
      <div className="grid" style={{ gridTemplateColumns: `64px repeat(${visibleColumns.length}, minmax(170px, 1fr))`, minWidth: 64 + visibleColumns.length * 170 }}>
        <div className="sticky left-0 top-0 z-30 flex h-16 items-center justify-center border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">Hora</div>
        {visibleColumns.map((column) => <div key={column.id} className="sticky top-0 z-20 flex h-16 min-w-0 items-center justify-center gap-2 border-b border-l border-slate-200 bg-white px-3 text-center"><span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${column.professional ? colors.get(column.professional) ?? 'bg-blue-500' : 'bg-slate-300'}`} /><div className="min-w-0"><h3 className={`truncate text-sm font-semibold ${view === 'week' ? 'capitalize' : ''}`}>{column.title}</h3>{view === 'day' && <p className="mt-1 text-[11px] text-slate-400">{format(parseISO(column.day), 'd MMM', { locale: es })}</p>}</div></div>)}
        <div className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50" style={{ height }}>{ticks.filter((minute) => minute % 60 === 0).map((minute) => <span key={minute} className="absolute right-2 -translate-y-1/2 bg-slate-50 px-1 text-[11px] tabular-nums text-slate-500" style={{ top: GRID_PADDING + (minute - bounds.startMinute) * PIXELS_PER_MINUTE }}>{hourLabel(minute)}</span>)}</div>
        {visibleColumns.map((column) => {
          const packed = layoutOverlaps(events.filter((event) => event.day === column.day && (!column.professional || event.item.professionalId === column.professional)))
          return <div key={column.id} role="group" aria-label={column.label} className="relative min-w-0 border-r border-slate-200 last:border-r-0" style={{ height }}>
            {ticks.map((minute) => <div key={minute} aria-hidden="true" className={`pointer-events-none absolute inset-x-0 border-t ${minute % 60 === 0 ? 'border-slate-200' : 'border-dashed border-slate-100'}`} style={{ top: GRID_PADDING + (minute - bounds.startMinute) * PIXELS_PER_MINUTE }} />)}
            {packed.map((event) => {
              const status = displayStatus(event.appointment)
              const geometry = eventGeometry(event, bounds.startMinute)
              const time = `${timeInZone(event.item.startsAt, event.appointment.branch.timezone)}–${timeInZone(event.item.endsAt, event.appointment.branch.timezone)}`
              const label = `Ver turno de ${event.appointment.customer.displayName}, ${event.item.serviceName}, ${event.item.professionalName}, ${time}, ${statusLabels[status]}`
              const muted = status === 'cancelled' || status === 'expired'
              return <button key={event.id} type="button" aria-haspopup="dialog" aria-label={label} title={`${label} · ${event.appointment.branch.name} · ${event.appointment.branch.timezone}`} onClick={() => onOpen(event.appointment)} className={`absolute overflow-hidden rounded-md px-2 py-0.5 text-left text-white shadow-sm transition hover:brightness-95 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 ${colors.get(event.item.professionalId) ?? 'bg-blue-500'} ${muted ? 'opacity-60' : ''} ${status === 'pending' ? 'border-2 border-dashed border-white/70' : 'border-l-[3px] border-white/40'}`} style={{ ...geometry, left: `calc(${event.lane * 100 / event.laneCount}% + 2px)`, width: `calc(${100 / event.laneCount}% - 4px)` }}>
                <span className={`block truncate text-xs font-semibold leading-4 ${status === 'cancelled' ? 'line-through' : ''}`}>{event.appointment.customer.displayName}</span>
                {geometry.height >= 36 && <span className="block truncate text-[10px] leading-3.5">{time} · {event.item.serviceName}</span>}
                {geometry.height >= 56 && <span className="block truncate text-[10px] leading-3.5">{event.item.professionalName} · {statusLabels[status]}</span>}
              </button>
            })}
          </div>
        })}
      </div>
    </div>
    <p className="text-xs leading-relaxed text-slate-500">Horas locales de cada sucursal. Tocá un turno para ver el detalle. Pendientes: borde punteado · Cancelados: nombre tachado. Deslizá para recorrer horas y columnas.</p>
  </section>
}
