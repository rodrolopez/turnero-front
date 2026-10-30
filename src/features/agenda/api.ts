import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/useAuthStore'
import { actionResponseSchema, agendaResponseSchema, type AgendaAction, type AgendaFilters } from './schemas'

export async function fetchAgenda(tenantId: string, filters: AgendaFilters, signal?: AbortSignal) {
  const { branchId, ...params } = filters
  return agendaResponseSchema.parse((await api.get<unknown>('/appointments', { signal, params: { ...params, ...(branchId ? { branchId } : {}) }, headers: { 'X-Tenant-Id': tenantId } })).data)
}
export function useAgenda(filters: AgendaFilters | null) {
  const tenantId = useAuthStore((state) => state.tenantId)
  const role = useAuthStore((state) => state.tenantRole)
  const userId = useAuthStore((state) => state.user?.id)
  return useQuery({
    queryKey: ['agenda', tenantId, role, userId, filters], enabled: Boolean(tenantId && filters),
    queryFn: ({ signal }) => fetchAgenda(tenantId!, filters!, signal),
    staleTime: 0, refetchInterval: 30_000, retry: false,
  })
}
export async function manageAppointment(tenantId: string, id: string, action: AgendaAction) {
  const response = actionResponseSchema.parse((await api.post<unknown>(`/appointments/${id}/${action}`, undefined, { headers: { 'X-Tenant-Id': tenantId } })).data)
  if (response.appointmentId !== id || response.status !== (action === 'confirm' ? 'confirmed' : 'cancelled')) throw new Error('La respuesta no coincide con el cambio solicitado')
  return response
}
export function useAgendaAction(tenantSlug: string) {
  const tenantId = useAuthStore((state) => state.tenantId)
  const client = useQueryClient()
  const invalidate = () => Promise.all([
    client.invalidateQueries({ queryKey: ['agenda', tenantId] }),
    client.invalidateQueries({ queryKey: ['public-availability', tenantSlug] }),
    client.invalidateQueries({ queryKey: ['availability', tenantId] }),
  ])
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: AgendaAction }) => {
      if (!tenantId) throw new Error('No hay una empresa activa')
      return manageAppointment(tenantId, id, action)
    },
    retry: false,
    onSuccess: async () => { await invalidate() },
    onError: () => { void invalidate() },
  })
}

const myAgendaContextSchema = z.object({
  professionals: z.array(z.object({ id: z.uuid(), name: z.string() })),
  branches: z.array(z.object({ id: z.uuid(), name: z.string(), timezone: z.string() })),
})
export function useMyAgendaContext() {
  const { tenantId, user, tenantRole } = useAuthStore()
  return useQuery({
    queryKey: ['my-agenda-context', tenantId, user?.id],
    enabled: Boolean(tenantId && user && tenantRole === 'STAFF'),
    queryFn: async ({ signal }) => myAgendaContextSchema.parse((await api.get<unknown>('/appointments/my-context', { signal, headers: { 'X-Tenant-Id': tenantId } })).data),
    retry: false,
  })
}
