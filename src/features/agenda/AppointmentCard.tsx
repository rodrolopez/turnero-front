import { Check, MapPin, Scissors, UserRound, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { timeInZone, dateInZone, formatPrice } from '../booking/utils'
import { displayStatus, statusClasses, statusLabels } from './utils'
import type { AgendaAction, AgendaAppointment } from './schemas'

export function AppointmentCard({ appointment, onAction, disabled, readOnly }: { appointment: AgendaAppointment; onAction: (action: AgendaAction) => void; disabled?: boolean; readOnly?: boolean }) {
  const status = displayStatus(appointment)
  const timezone = appointment.branch.timezone
  const crossDay = dateInZone(timezone, new Date(appointment.startsAt)) !== dateInZone(timezone, new Date(appointment.endsAt))
  return <article className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${status === 'pending' ? 'border-amber-200' : status === 'confirmed' ? 'border-teal-200' : 'border-slate-200'}`} aria-label={`Turno de ${appointment.customer.displayName}`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-lg font-semibold tabular-nums">{timeInZone(appointment.startsAt, timezone)}–{timeInZone(appointment.endsAt, timezone)}</p>{crossDay && <p className="mt-1 text-xs text-slate-500">{dateInZone(timezone, new Date(appointment.startsAt))} → {dateInZone(timezone, new Date(appointment.endsAt))}</p>}<h3 className="mt-1 font-semibold">{appointment.customer.displayName}</h3></div><span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClasses[status]}`}>{statusLabels[status]}</span></div>
    <p className={`mt-3 text-xs font-medium ${appointment.paymentStatus === 'paid' ? 'text-teal-700' : 'text-amber-800'}`}>{appointment.paymentStatus === 'paid' ? 'Pagado' : appointment.paymentStatus === 'refunded' ? 'Reembolsado' : 'Pago pendiente'}</p>
    {appointment.observations && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-600">{appointment.observations}</p>}
    <div className="mt-4 space-y-2.5 text-sm"><p className="flex items-center gap-2 text-slate-600"><MapPin size={15} className="shrink-0 text-teal-700" />{appointment.branch.name}<span className="text-xs text-slate-400">· {timezone}</span></p>
      {appointment.items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"><div><p className="flex items-center gap-2 font-medium"><Scissors size={14} className="text-slate-400" />{item.serviceName}<span className="text-xs font-normal text-slate-500">{item.durationMinutes} min</span></p><p className="mt-1 flex items-center gap-2 text-xs text-slate-500"><UserRound size={13} />{item.professionalName} · {timeInZone(item.startsAt, timezone)}–{timeInZone(item.endsAt, timezone)}</p></div><span className="text-sm text-slate-600">{formatPrice(item.price)}</span></div>)}
      <p className="break-all text-xs text-slate-500">{appointment.customer.email}{appointment.customer.phone ? ` · ${appointment.customer.phone}` : ''}</p>
      {status === 'pending' && appointment.holdExpiresAt && <p className="text-xs text-amber-800">Aprobar antes de {dateInZone(timezone, new Date(appointment.holdExpiresAt))} · {timeInZone(appointment.holdExpiresAt, timezone)}.</p>}
      {status === 'expired' && <p className="text-xs text-slate-500">El plazo de aprobación de este turno terminó.</p>}
    </div>
    {!readOnly && (status === 'pending' || status === 'confirmed') && <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">{status === 'pending' && <Button variant="primary" disabled={disabled} onClick={() => onAction('confirm')} aria-label={`Confirmar turno de ${appointment.customer.displayName}`}><Check size={16} />Confirmar</Button>}<Button disabled={disabled} onClick={() => onAction('cancel')} aria-label={`Cancelar turno de ${appointment.customer.displayName}`}><X size={16} />Cancelar</Button></div>}
  </article>
}
