import { ArrowLeft, ArrowRight, Clock3, RefreshCw } from 'lucide-react'
import { usePublicAvailability } from './api'
import { BookingCalendar } from './Calendar'
import { availableStarts, dateInZone, readableDate, timeInZone } from './utils'
import type { PublicBranch, PublicService, PublicScheduler, PublicProfessional, ProfessionalSelection, Slot } from './schemas'
import { Button } from '../../components/ui/Button'
import { AvailabilitySkeleton } from './BookingSkeleton'
import { ErrorMessage } from '../../components/Feedback'
import { getErrorMessage } from '../../api/client'

export function DateTimeStep({ slug, branch, service, scheduler, professionals, selection, date, slot, rejectedStart, onDate, onSlot, onBack, onNext }: {
  slug: string; branch: PublicBranch; service: PublicService; scheduler: PublicScheduler; professionals: PublicProfessional[]; selection: ProfessionalSelection
  date: string; slot: Slot | null; rejectedStart: string | null; onDate: (date: string) => void; onSlot: (slot: Slot) => void; onBack: () => void; onNext: () => void
}) {
  const availability = usePublicAvailability(slug, branch.id, service.id, date, scheduler.id, selection.mode === 'specific' ? selection.professionalId : undefined)
  const today = dateInZone(branch.timezone)
  const slots = availableStarts(availability.data?.slots ?? [], professionals, selection).filter((entry) => !rejectedStart || Date.parse(entry.startAt) !== Date.parse(rejectedStart))
  const selectedStillAvailable = slot && slots.some((entry) => Date.parse(entry.startAt) === Date.parse(slot.startAt)) && !availability.isError && date >= today
  return <><p className="mb-5 text-sm leading-relaxed text-slate-500">{service.name} · {service.duration_minutes} minutos. Todos los horarios corresponden a {branch.name} ({branch.timezone}).</p>
    <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]"><BookingCalendar key={branch.id} today={today} value={date} onChange={onDate} />
      <section aria-label="Horarios disponibles" className="min-w-0"><div className="mb-4 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold capitalize">{date ? readableDate(date) : 'Elegí primero una fecha'}</h3>{date && <Button onClick={() => void availability.refetch()} busy={availability.isFetching} aria-label="Actualizar horarios"><RefreshCw size={15} /></Button>}</div>
        <div aria-live="polite" aria-atomic="false">
          {!date ? <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500"><Clock3 size={28} className="text-teal-600" />Los horarios disponibles aparecerán acá.</div> : availability.isPending ? <AvailabilitySkeleton /> : availability.isError ? <div className="space-y-3"><ErrorMessage message={getErrorMessage(availability.error)} /><Button onClick={() => void availability.refetch()}>Volver a consultar</Button></div> : !slots.length ? <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500"><p className="font-medium text-slate-800">No hay horarios disponibles para este día.</p><p className="mt-2">Probá otra fecha{selection.mode === 'specific' ? ' o elegí «Cualquiera disponible» en el paso anterior' : ''}.</p></div> : <><p className="mb-3 text-xs text-slate-500">{slots.length} horarios disponibles{availability.isFetching ? ' · Actualizando…' : ''}</p><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.map((entry) => <button type="button" key={entry.startAt} aria-pressed={slot?.startAt === entry.startAt} onClick={() => onSlot(entry)} className={`min-h-12 rounded-xl border px-2 py-3 text-sm font-semibold transition ${slot?.startAt === entry.startAt ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-teal-500 hover:bg-teal-50'}`}>{timeInZone(entry.startAt, branch.timezone)}</button>)}</div></>}
        </div>
        {slot && !selectedStillAvailable && !availability.isPending && <p role="status" className="mt-4 text-sm text-amber-800">El horario elegido ya no está disponible. Seleccioná otro para continuar.</p>}
      </section>
    </div><div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-100 pt-5"><Button onClick={onBack}><ArrowLeft size={16} />Volver</Button><Button variant="primary" disabled={!selectedStillAvailable || availability.isFetching} onClick={onNext}>Continuar<ArrowRight size={16} /></Button></div>
  </>
}
