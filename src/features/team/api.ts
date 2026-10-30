import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/useAuthStore'
import { useCatalogMutation } from '../catalog/api'
const memberSchema = z.object({ id: z.uuid(), user_id: z.uuid(), role: z.enum(['OWNER', 'ADMIN', 'STAFF']), status: z.enum(['active', 'invited', 'suspended']), full_name: z.string(), email: z.string(), has_professional: z.boolean() })
export const adminInputSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email('Ingresá un correo válido').max(320)), fullName: z.string().trim().min(1, 'Ingresá el nombre').max(150) })
export function useTeam() {
  const { tenantId, tenantRole } = useAuthStore()
  return useQuery({ queryKey: ['catalog', tenantId, 'team', tenantRole], enabled: Boolean(tenantId && tenantRole === 'OWNER'), retry: false, queryFn: async ({ signal }) => z.object({ members: z.array(memberSchema) }).parse((await api.get<unknown>('/team', { signal, headers: { 'X-Tenant-Id': tenantId } })).data).members })
}
export function useCreateAdmin() {
  return useCatalogMutation(async (tenantId, { input, key }: { input: z.infer<typeof adminInputSchema>; key: string }) => {
    if (useAuthStore.getState().tenantRole !== 'OWNER') throw new Error('Sólo el propietario puede asignar administradores')
    return z.object({ member: memberSchema.pick({ id: true, user_id: true, role: true, status: true }) }).parse((await api.post<unknown>('/team/admins', adminInputSchema.parse(input), { headers: { 'X-Tenant-Id': tenantId, 'Idempotency-Key': key } })).data).member
  })
}
export const roleLabels = { OWNER: 'Propietario', ADMIN: 'Administrador', STAFF: 'Profesional (STAFF)' }
