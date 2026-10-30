import { Building2, CalendarDays, Clock3, Scissors, UserRound } from 'lucide-react'
import type { PublicBranch, PublicService, PublicScheduler, ProfessionalSelection, PublicProfessional, Slot } from './schemas'
import { formatPrice, readableDate, timeInZone } from './utils'

export interface Visit { branch: PublicBranch; service: PublicService; scheduler: PublicScheduler; selection: ProfessionalSelection; professionals: PublicProfessional[]; date: string; slot: Slot }
export function BookingSummary({ visit }: { visit: Visit }) {
  const professionalName = visit.selection.mode === 'any' ? 'Cualquiera disponible' : visit.professionals.find((professional) => visit.selection.mode === 'specific' && professional.id === visit.selection.professionalId)?.display_name
  return <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-5"><h3 className="mb-4 text-sm font-semibold text-teal-900">Tu visita</h3><dl className="space-y-3 text-sm text-slate-600">
    <div className="flex gap-3"><Building2 size={17} className="shrink-0 text-teal-700" /><div><dt className="sr-only">Sucursal</dt><dd className="font-medium text-slate-900">{visit.branch.name}</dd>{visit.branch.address && <dd className="mt-0.5 text-xs">{visit.branch.address}</dd>}</div></div>
    <div className="flex gap-3"><Scissors size={17} className="shrink-0 text-teal-700" /><div><dt className="sr-only">Servicio</dt><dd>{visit.service.name} · {visit.service.duration_minutes} min</dd><dd className="mt-0.5 text-xs">Precio: {formatPrice(visit.service.price)}</dd></div></div>
    <div className="flex gap-3"><UserRound size={17} className="shrink-0 text-teal-700" /><dt className="sr-only">Profesional</dt><dd>{professionalName}</dd></div>
    <div className="flex gap-3"><CalendarDays size={17} className="shrink-0 text-teal-700" /><dt className="sr-only">Fecha</dt><dd className="capitalize">{readableDate(visit.date)}</dd></div>
    <div className="flex gap-3"><Clock3 size={17} className="shrink-0 text-teal-700" /><dt className="sr-only">Hora</dt><dd>{timeInZone(visit.slot.startAt, visit.branch.timezone)}–{timeInZone(visit.slot.endAt, visit.branch.timezone)}<span className="mt-1 block text-xs text-slate-500">Hora local de la sucursal · {visit.branch.timezone}</span></dd></div>
  </dl></div>
}
