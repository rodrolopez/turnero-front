import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { PublicProfessional, PublicScheduler, ProfessionalSelection, Slot } from './schemas'

export function dateInZone(timezone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => parts.find((item) => item.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
export function timeInZone(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('es-AR', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value))
}
export function readableDate(date: string): string {
  return format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })
}
export const formatPrice = (price: string) => new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(price))
export function eligibleProfessionals(professionals: PublicProfessional[], branchId: string, serviceId: string, scheduler: PublicScheduler): PublicProfessional[] {
  return professionals.filter((professional) => professional.branchIds.includes(branchId) && professional.serviceIds.includes(serviceId) && professional.bookingOptions.some((option) => option.branchId === branchId && option.serviceId === serviceId) && (scheduler.professionalIds === null || scheduler.professionalIds.includes(professional.id)))
}
export function availableStarts(slots: Slot[], professionals: PublicProfessional[], selection: ProfessionalSelection, now = Date.now()): Slot[] {
  const eligible = new Set(professionals.map((professional) => professional.id))
  const starts = new Map<string, Slot>()
  for (const slot of slots) {
    if (new Date(slot.startAt).getTime() <= now || !eligible.has(slot.professionalId)) continue
    if (selection.mode === 'specific' && slot.professionalId !== selection.professionalId) continue
    // With "any", the API chooses a professional; show each instant once.
    const instant = new Date(slot.startAt).toISOString()
    if (!starts.has(instant)) starts.set(instant, slot)
  }
  return [...starts.values()].sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt))
}
