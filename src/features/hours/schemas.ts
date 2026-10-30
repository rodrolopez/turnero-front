import { z } from 'zod'

export const days = [
  { value: 1, label: 'Lunes' }, { value: 2, label: 'Martes' }, { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' }, { value: 5, label: 'Viernes' }, { value: 6, label: 'Sábado' }, { value: 0, label: 'Domingo' },
] as const
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Usá el formato HH:MM')
const weekday = z.number().int().min(0).max(6)
const hour = z.object({ weekday, startsAt: time, endsAt: time })
const workingHour = hour.extend({ branchId: z.uuid('Seleccioná una sucursal') })
type Interval = z.infer<typeof hour> & { branchId?: string }
function validateIntervals(hours: Interval[], ctx: z.RefinementCtx, path: string) {
  hours.forEach((entry, index) => {
    if (entry.startsAt >= entry.endsAt) ctx.addIssue({ code: 'custom', path: [path, index, 'endsAt'], message: 'El fin debe ser posterior al inicio' })
    for (let other = index + 1; other < hours.length; other += 1) {
      const candidate = hours[other]!
      if (entry.weekday === candidate.weekday && entry.branchId === candidate.branchId && entry.startsAt < candidate.endsAt && candidate.startsAt < entry.endsAt) {
        ctx.addIssue({ code: 'custom', path: [path, other, 'startsAt'], message: 'Este tramo se superpone con otro del mismo día' })
      }
    }
  })
}
export const branchHoursFormSchema = z.object({ hours: z.array(hour).max(100, 'Máximo 100 tramos') }).superRefine((input, ctx) => validateIntervals(input.hours, ctx, 'hours'))
export const assignmentsFormSchema = z.object({
  branchIds: z.array(z.uuid()).max(100), serviceIds: z.array(z.uuid()).max(100), workingHours: z.array(workingHour).max(500, 'Máximo 500 tramos'),
}).superRefine((input, ctx) => {
  validateIntervals(input.workingHours, ctx, 'workingHours')
  if (new Set(input.branchIds).size !== input.branchIds.length) ctx.addIssue({ code: 'custom', path: ['branchIds'], message: 'No repitas sucursales' })
  if (new Set(input.serviceIds).size !== input.serviceIds.length) ctx.addIssue({ code: 'custom', path: ['serviceIds'], message: 'No repitas servicios' })
  input.workingHours.forEach((entry, index) => {
    if (!input.branchIds.includes(entry.branchId)) ctx.addIssue({ code: 'custom', path: ['workingHours', index, 'branchId'], message: 'Asigná esta sucursal o quitá el tramo' })
  })
})
const databaseTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(?::00)?$/).transform((value) => value.slice(0, 5))
const responseHour = z.object({ weekday, starts_at: databaseTime, ends_at: databaseTime }).transform(({ weekday, starts_at, ends_at }) => ({ weekday, startsAt: starts_at, endsAt: ends_at }))
export const branchHoursResponseSchema = z.object({ hours: z.array(responseHour) })
const responseWorkingHour = z.object({ branch_id: z.uuid(), weekday, starts_at: databaseTime, ends_at: databaseTime }).transform(({ branch_id, weekday, starts_at, ends_at }) => ({ branchId: branch_id, weekday, startsAt: starts_at, endsAt: ends_at }))
export const assignmentsResponseSchema = z.object({ assignments: z.object({ branchIds: z.array(z.uuid()), serviceIds: z.array(z.uuid()), workingHours: z.array(responseWorkingHour) }) })
export type BranchHoursInput = z.infer<typeof branchHoursFormSchema>
export type AssignmentsInput = z.infer<typeof assignmentsFormSchema>
