import { z } from 'zod'

export const userSchema = z.object({ id: z.uuid(), email: z.email(), fullName: z.string() })
export const authResponseSchema = z.object({ user: userSchema, accessToken: z.string().min(1), requiresPasswordChange: z.literal(false).optional() })
export const passwordChallengeSchema = z.object({ requiresPasswordChange: z.literal(true), temporaryToken: z.string().min(1), user: userSchema, expiresIn: z.number().int().positive() })
export const loginResponseSchema = z.union([authResponseSchema, passwordChallengeSchema])
export const forcePasswordChangeSchema = z.object({ password: z.string().min(8, 'Usá al menos 8 caracteres').max(72).refine((value) => new TextEncoder().encode(value).length <= 72, 'La contraseña supera el límite de 72 bytes').refine((value) => value !== '12345678', 'Elegí una contraseña diferente de la temporal'), confirmPassword: z.string() }).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Las contraseñas no coinciden' })
export type PasswordChallenge = z.infer<typeof passwordChallengeSchema>
export const tenantSchema = z.object({
  id: z.uuid(), name: z.string(), slug: z.string(), status: z.enum(['active', 'suspended', 'cancelled']),
  timezone: z.string(), slotIntervalMinutes: z.number(), role: z.enum(['OWNER', 'ADMIN', 'STAFF']),
})
export const tenantsResponseSchema = z.object({ tenants: z.array(tenantSchema) })
export const createdTenantSchema = z.object({ tenant: tenantSchema.omit({ role: true }), role: tenantSchema.shape.role })
const email = z.string().trim().toLowerCase().pipe(z.email('Ingresá un correo válido').max(320))
const password = z.string().min(1, 'Ingresá tu contraseña').max(72, 'Máximo 72 caracteres')
export const loginSchema = z.object({ email, password })
export const registerSchema = z.object({ email, password: password.min(8, 'Usá al menos 8 caracteres'), fullName: z.string().trim().min(1, 'Ingresá tu nombre').max(150) })
export const createTenantSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá el nombre de la empresa').max(150),
  slug: z.string().trim().toLowerCase().min(1, 'Ingresá un identificador').max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usá letras minúsculas, números y guiones entre palabras'),
  timezone: z.string().trim().min(1).max(60).refine((value) => {
    try { new Intl.DateTimeFormat('es', { timeZone: value }); return true } catch { return false }
  }, 'Ingresá una zona horaria válida, como America/Argentina/Buenos_Aires'),
  slotIntervalMinutes: z.number().int().refine((value) => [5, 10, 15, 20, 30, 60].includes(value), 'Elegí un intervalo válido'),
})
export type User = z.infer<typeof userSchema>
export type Tenant = z.infer<typeof tenantSchema>
export type AuthResponse = z.infer<typeof authResponseSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type CreateTenantInput = z.infer<typeof createTenantSchema>
