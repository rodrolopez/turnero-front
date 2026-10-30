import { z } from 'zod'

export const appointmentStatusSchema = z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'expired'])
const timestamp = z.iso.datetime({ offset: true })
export const agendaAppointmentSchema = z.object({
  id: z.uuid(), status: appointmentStatusSchema, paymentStatus: z.enum(['pending', 'paid', 'refunded']), observations: z.string().nullable(), holdExpiresAt: timestamp.nullable(), startsAt: timestamp, endsAt: timestamp,
  branch: z.object({ id: z.uuid(), name: z.string(), timezone: z.string() }),
  customer: z.object({ displayName: z.string(), email: z.string(), phone: z.string().nullable() }),
  items: z.array(z.object({ id: z.uuid(), serviceId: z.uuid(), serviceName: z.string(), professionalId: z.uuid(), professionalName: z.string(), startsAt: timestamp, endsAt: timestamp, durationMinutes: z.number().int().positive(), price: z.string().regex(/^\d+(\.\d+)?$/) })).min(1),
})
export const agendaResponseSchema = z.object({ appointments: z.array(agendaAppointmentSchema), pagination: z.object({ total: z.number().int().nonnegative(), limit: z.number().int().positive(), offset: z.number().int().nonnegative() }) })
export const actionResponseSchema = z.object({ appointmentId: z.uuid(), status: appointmentStatusSchema })
export type AgendaAppointment = z.infer<typeof agendaAppointmentSchema>
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>
export type AgendaFilters = { branchId: string; startDate: string; endDate: string; offset: number; limit: number }
export type AgendaAction = 'confirm' | 'cancel'
