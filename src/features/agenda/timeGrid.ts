import { dateInZone, timeInZone } from '../booking/utils'
import type { AgendaAppointment } from './schemas'

export const PIXELS_PER_MINUTE = 1.6
export const GRID_PADDING = 12
export const professionalColors = ['bg-blue-500', 'bg-teal-500', 'bg-purple-500', 'bg-rose-500', 'bg-indigo-500', 'bg-cyan-600', 'bg-orange-600', 'bg-fuchsia-600'] as const
export interface GridProfessional { id: string; name: string }
export interface TimeGridEvent {
  id: string
  appointment: AgendaAppointment
  item: AgendaAppointment['items'][number]
  day: string
  startMinute: number
  endMinute: number
}
function minuteOfDay(value: string, timezone: string) {
  const [hour, minute] = timeInZone(value, timezone).split(':').map(Number)
  const instant = new Date(value)
  return hour * 60 + minute + instant.getUTCSeconds() / 60 + instant.getUTCMilliseconds() / 60_000
}
export function buildTimeGridEvents(appointments: AgendaAppointment[], days: string[], professionalId = ''): TimeGridEvent[] {
  const events: TimeGridEvent[] = []
  for (const appointment of appointments) for (const item of appointment.items) {
    if (professionalId && item.professionalId !== professionalId) continue
    const timezone = appointment.branch.timezone
    const firstDay = dateInZone(timezone, new Date(item.startsAt))
    const lastDay = dateInZone(timezone, new Date(Date.parse(item.endsAt) - 1))
    for (const day of days) {
      if (day < firstDay || day > lastDay) continue
      const startMinute = day > firstDay ? 0 : minuteOfDay(item.startsAt, timezone)
      const endDay = dateInZone(timezone, new Date(item.endsAt))
      let endMinute = endDay > day ? 1440 : minuteOfDay(item.endsAt, timezone)
      // A clock rollback may make the local end precede the local start.
      if (endMinute <= startMinute) endMinute = Math.min(1440, startMinute + (Date.parse(item.endsAt) - Date.parse(item.startsAt)) / 60_000)
      if (endMinute > startMinute) events.push({ id: `${item.id}:${day}`, appointment, item, day, startMinute, endMinute })
    }
  }
  return events
}
export function timeGridBounds(events: TimeGridEvent[]) {
  return {
    startMinute: Math.max(0, Math.min(8 * 60, ...events.map((event) => Math.floor(event.startMinute / 60) * 60))),
    endMinute: Math.min(1440, Math.max(22 * 60, ...events.map((event) => Math.ceil(event.endMinute / 60) * 60))),
  }
}
export function eventGeometry(event: Pick<TimeGridEvent, 'startMinute' | 'endMinute'>, gridStart: number) {
  return { top: GRID_PADDING + (event.startMinute - gridStart) * PIXELS_PER_MINUTE, height: Math.max(2, (event.endMinute - event.startMinute) * PIXELS_PER_MINUTE - 2) }
}
export function layoutOverlaps<T extends { id: string; startMinute: number; endMinute: number }>(events: T[]): (T & { lane: number; laneCount: number })[] {
  const sorted = [...events].sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute || a.id.localeCompare(b.id))
  const result: (T & { lane: number; laneCount: number })[] = []
  let cluster: T[] = []
  let clusterEnd = -1
  function flush() {
    const ends: number[] = []
    const packed = cluster.map((event) => {
      let lane = ends.findIndex((end) => end <= event.startMinute)
      if (lane === -1) lane = ends.length
      ends[lane] = event.endMinute
      return { ...event, lane }
    })
    result.push(...packed.map((event) => ({ ...event, laneCount: ends.length })))
    cluster = []
  }
  for (const event of sorted) {
    if (event.startMinute >= clusterEnd) flush()
    cluster.push(event)
    clusterEnd = Math.max(cluster.length === 1 ? -1 : clusterEnd, event.endMinute)
  }
  flush()
  return result
}
export function colorByProfessional(ids: string[]): Map<string, string> {
  return new Map([...new Set(ids)].sort().map((id, index) => [id, professionalColors[index % professionalColors.length]]))
}
export function mergeGridProfessionals(assigned: GridProfessional[], appointments: AgendaAppointment[]): GridProfessional[] {
  const professionals = new Map(assigned.map((professional) => [professional.id, professional]))
  for (const appointment of appointments) for (const item of appointment.items) {
    if (!professionals.has(item.professionalId)) professionals.set(item.professionalId, { id: item.professionalId, name: item.professionalName })
  }
  return [...professionals.values()].sort((a, b) => a.name.localeCompare(b.name, 'es') || a.id.localeCompare(b.id))
}
