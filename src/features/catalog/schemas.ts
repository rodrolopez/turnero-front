import { z } from 'zod'

const base = { id: z.uuid(), is_active: z.boolean() }
export const branchSchema = z.object({ ...base, name: z.string(), address: z.string().nullable(), timezone: z.string() })
export const serviceSchema = z.object({ ...base, name: z.string(), duration_minutes: z.number().int(), price: z.string().regex(/^\d+(\.\d+)?$/) })
export const professionalSchema = z.object({ ...base, display_name: z.string(), user_id: z.uuid().nullable(), access_email: z.string().nullable().optional(), access_role: z.enum(['OWNER', 'ADMIN', 'STAFF']).nullable().optional(), membership_status: z.enum(['active', 'invited', 'suspended']).nullable().optional() })
const name = z.string().trim().min(1, 'Ingresá un nombre').max(150, 'Máximo 150 caracteres')
export const timezoneSchema = z.string().trim().min(1).max(60).refine((value) => {
  try { new Intl.DateTimeFormat('es', { timeZone: value }); return true } catch { return false }
}, 'Ingresá una zona horaria válida')
export const branchFormSchema = z.object({ name, address: z.string().trim().max(2000, 'Máximo 2000 caracteres'), timezone: timezoneSchema, isActive: z.boolean() })
export const serviceFormSchema = z.object({ name, durationMinutes: z.number('Ingresá una duración').int('Usá minutos enteros').min(15, 'Mínimo 15 minutos').multipleOf(15, 'Debe ser múltiplo de 15 minutos'), price: z.number('Ingresá un precio').nonnegative('El precio no puede ser negativo').max(9999999999.99, 'El precio supera el máximo permitido').refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001, 'Usá hasta dos decimales'), isActive: z.boolean() })
export const professionalFormSchema = z.object({ displayName: name, userId: z.union([z.literal(''), z.uuid('Ingresá un UUID válido')]), isActive: z.boolean() })
export type Branch = z.infer<typeof branchSchema>
export type Service = z.infer<typeof serviceSchema>
export type Professional = z.infer<typeof professionalSchema>
export type BranchInput = z.infer<typeof branchFormSchema>
export type ServiceInput = z.infer<typeof serviceFormSchema>
export type ProfessionalInput = z.infer<typeof professionalFormSchema>
