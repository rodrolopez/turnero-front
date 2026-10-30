import { addDays, format, isExists, parseISO, startOfWeek } from 'date-fns'
import { dateInZone } from '../booking/utils'
import type { AgendaAppointment, AppointmentStatus } from './schemas'

export type AgendaView = 'day' | 'week'
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  return isExists(year, month - 1, day)
}
export function agendaRange(date: string, view: AgendaView) {
  if (!validDate(date)) return null
  const start = view === 'week' ? startOfWeek(parseISO(date), { weekStartsOn: 1 }) : parseISO(date)
  const days = Array.from({ length: view === 'week' ? 7 : 1 }, (_, index) => format(addDays(start, index), 'yyyy-MM-dd'))
  return { startDate: days[0], endDate: days[days.length - 1], days }
}
export function displayStatus(appointment: AgendaAppointment, now = Date.now()): AppointmentStatus {
  if (appointment.status === 'pending' && appointment.holdExpiresAt && Date.parse(appointment.holdExpiresAt) <= now) return 'expired'
  return appointment.status
}
export function occursOnDay(appointment: AgendaAppointment, day: string): boolean {
  return dateInZone(appointment.branch.timezone, new Date(appointment.startsAt)) <= day
    && dateInZone(appointment.branch.timezone, new Date(Date.parse(appointment.endsAt) - 1)) >= day
}
export const statusLabels: Record<AppointmentStatus, string> = { pending: 'Pendiente', confirmed: 'Confirmado', cancelled: 'Cancelado', completed: 'Completado', no_show: 'No asistió', expired: 'Vencido' }
export const statusClasses: Record<AppointmentStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-900', confirmed: 'border-teal-200 bg-teal-50 text-teal-800',
  cancelled: 'border-red-200 bg-red-50 text-red-700', completed: 'border-blue-200 bg-blue-50 text-blue-800',
  no_show: 'border-orange-200 bg-orange-50 text-orange-800', expired: 'border-slate-200 bg-slate-100 text-slate-600',
}
