import { useEffect, useRef } from 'react'
import { Check, CalendarCheck, Clock3 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import type { BookingResponse } from './schemas'
import type { Visit } from './BookingSummary'
import { dateInZone, readableDate, timeInZone, formatPrice } from './utils'

export function BookingSuccess({ response, visit, onReset }: { response: BookingResponse; visit: Visit; onReset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  const appointment = response.appointment
  const item = appointment.items[0]!
  const confirmed = appointment.status === 'confirmed'
  const professional = visit.professionals.find((entry) => entry.id === item.professionalId)
  return <section className="mx-auto max-w-xl text-center"><div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${confirmed ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-800'}`}>{confirmed ? <Check size={32} /> : <Clock3 size={30} />}</div>
    <p className="eyebrow">{confirmed ? 'NOS VEMOS PRONTO' : 'SOLICITUD RECIBIDA'}</p><h2 ref={heading} tabIndex={-1} className="mt-3 text-3xl font-semibold tracking-tight outline-none">{confirmed ? 'Tu turno está confirmado' : 'Tu turno está pendiente de aprobación'}</h2>
    <p className="mt-4 text-sm leading-relaxed text-slate-500">{confirmed ? 'Ya reservamos tu lugar. Guardá este comprobante con los detalles de tu visita.' : 'La empresa debe aprobar tu solicitud. Por ahora, tu turno todavía no está confirmado.'}</p>
    {!confirmed && appointment.holdExpiresAt && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">La solicitud vence el {readableDate(dateInZone(visit.branch.timezone, new Date(appointment.holdExpiresAt)))} a las {timeInZone(appointment.holdExpiresAt, visit.branch.timezone)} si no es aprobada.</p>}
    <div className="my-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left"><div className="mb-4 flex items-center gap-2 text-sm font-semibold"><CalendarCheck size={18} className="text-teal-700" />Tu comprobante</div><dl className="space-y-3 text-sm"><div><dt className="text-xs text-slate-500">Servicio</dt><dd className="mt-1 font-medium">{item.serviceName} · {item.durationMinutes} min · {formatPrice(item.price)}</dd></div><div><dt className="text-xs text-slate-500">Sucursal</dt><dd className="mt-1">{visit.branch.name}{visit.branch.address ? ` · ${visit.branch.address}` : ''}</dd></div><div><dt className="text-xs text-slate-500">Fecha y hora</dt><dd className="mt-1 capitalize">{readableDate(dateInZone(visit.branch.timezone, new Date(item.startsAt)))} · {timeInZone(item.startsAt, visit.branch.timezone)}–{timeInZone(item.endsAt, visit.branch.timezone)}</dd><dd className="mt-1 text-xs text-slate-500">Hora local de la sucursal · {visit.branch.timezone}</dd></div><div><dt className="text-xs text-slate-500">Profesional asignado</dt><dd className="mt-1">{professional?.display_name ?? 'Asignado por la empresa'}</dd></div><div className="border-t border-slate-200 pt-3"><dt className="text-xs text-slate-500">Código de reserva</dt><dd className="mt-1 break-all font-mono text-xs">{appointment.id}</dd></div></dl></div>
    <Button variant="primary" onClick={onReset}>Reservar otro turno</Button>
  </section>
}
