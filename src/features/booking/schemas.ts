import { z } from 'zod'

export const publicCatalogSchema = z.object({
  tenant: z.object({ name: z.string(), slug: z.string() }),
  branches: z.array(z.object({ id: z.uuid(), name: z.string(), address: z.string().nullable(), timezone: z.string() })),
  services: z.array(z.object({ id: z.uuid(), name: z.string(), duration_minutes: z.number().int().positive(), price: z.string().regex(/^\d+(\.\d+)?$/) })),
  professionals: z.array(z.object({ id: z.uuid(), display_name: z.string(), branchIds: z.array(z.uuid()), serviceIds: z.array(z.uuid()), bookingOptions: z.array(z.object({ branchId: z.uuid(), serviceId: z.uuid() })) })),
  schedulers: z.array(z.object({ id: z.uuid(), name: z.string(), branch_id: z.uuid().nullable(), requires_approval: z.boolean(), hold_duration_minutes: z.number().int().positive(), professionalIds: z.array(z.uuid()).nullable() })),
})
export const professionalSelectionSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('any') }),
  z.object({ mode: z.literal('specific'), professionalId: z.uuid() }),
])
const timestamp = z.iso.datetime({ offset: true })
export const slotSchema = z.object({ startAt: timestamp, endAt: timestamp, professionalId: z.uuid(), professionalName: z.string() })
export const availabilitySchema = z.object({
  branchId: z.uuid(), serviceId: z.uuid(), date: z.string(), timezone: z.string(),
  durationMinutes: z.number().positive(), slotIntervalMinutes: z.number().positive(), slots: z.array(slotSchema),
})
export const customerSchema = z.object({
  displayName: z.string().trim().min(1, 'Ingresá tu nombre').max(150, 'Máximo 150 caracteres'),
  email: z.string().trim().toLowerCase().pipe(z.email('Ingresá un correo válido').max(320)),
  phone: z.string().trim().max(40, 'Máximo 40 caracteres').refine((value) => !value || /^[+\d\s().-]+$/.test(value), 'Ingresá un teléfono válido'),
})
export const bookingRequestSchema = z.object({
  branchId: z.uuid(), schedulerId: z.uuid(), startsAt: timestamp,
  items: z.array(z.object({ serviceId: z.uuid(), professionalSelection: professionalSelectionSchema })).length(1),
  customer: customerSchema.omit({ phone: true }).extend({ phone: z.string().nullable() }),
})
export const bookingResponseSchema = z.object({ appointment: z.object({
  id: z.uuid(), status: z.enum(['pending', 'confirmed']), holdExpiresAt: timestamp.nullable(), branchId: z.uuid(), schedulerId: z.uuid(),
  items: z.array(z.object({ id: z.uuid(), serviceId: z.uuid(), professionalId: z.uuid(), startsAt: timestamp, endsAt: timestamp, durationMinutes: z.number().positive(), price: z.string().regex(/^\d+(\.\d+)?$/), serviceName: z.string() })).min(1),
}) })
export type PublicCatalog = z.infer<typeof publicCatalogSchema>
export type PublicBranch = PublicCatalog['branches'][number]
export type PublicService = PublicCatalog['services'][number]
export type PublicScheduler = PublicCatalog['schedulers'][number]
export type PublicProfessional = PublicCatalog['professionals'][number]
export type ProfessionalSelection = z.infer<typeof professionalSelectionSchema>
export type Slot = z.infer<typeof slotSchema>
export type CustomerInput = z.infer<typeof customerSchema>
export type BookingRequest = z.infer<typeof bookingRequestSchema>
export type BookingResponse = z.infer<typeof bookingResponseSchema>
