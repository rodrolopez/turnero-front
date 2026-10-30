import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/useAuthStore'

export const schedulerInputSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá un nombre').max(150),
  branchId: z.union([z.literal(''), z.uuid()]),
  requiresApproval: z.boolean(),
  holdDurationMinutes: z.number().int().min(5, 'Mínimo 5 minutos').max(1440, 'Máximo 1440 minutos'),
})
const schedulerSchema = z.object({ id: z.uuid(), name: z.string(), branch_id: z.uuid().nullable(), requires_approval: z.boolean(), hold_duration_minutes: z.number(), is_active: z.boolean() })
const listSchema = z.object({ schedulers: z.array(schedulerSchema) })
const responseSchema = z.object({ scheduler: schedulerSchema })
export type Scheduler = z.infer<typeof schedulerSchema>
export type SchedulerMutation = SchedulerInput | { id: string; input: SchedulerInput } | { id: string; isActive: boolean }
export type SchedulerInput = z.infer<typeof schedulerInputSchema>
export function useSchedulers() {
  const tenantId = useAuthStore((state) => state.tenantId)
  return useQuery({ queryKey: ['schedulers', tenantId], enabled: Boolean(tenantId), retry: false, queryFn: async ({ signal }) => listSchema.parse((await api.get<unknown>('/schedulers', { signal, headers: { 'X-Tenant-Id': tenantId } })).data).schedulers })
}
export async function saveScheduler(tenantId: string, input: SchedulerMutation) {
  const options = { headers: { 'X-Tenant-Id': tenantId } }
  if ('id' in input) {
    const payload = 'isActive' in input ? { isActive: input.isActive } : (() => {
      const valid = schedulerInputSchema.parse(input.input)
      return { ...valid, branchId: valid.branchId || null }
    })()
    return responseSchema.parse((await api.patch<unknown>(`/schedulers/${input.id}`, payload, options)).data).scheduler
  }
  const valid = schedulerInputSchema.parse(input)
  return responseSchema.parse((await api.post<unknown>('/schedulers', { ...valid, branchId: valid.branchId || null, isActive: true }, options)).data).scheduler
}
export function useSaveScheduler(slug: string) {
  const tenantId = useAuthStore((state) => state.tenantId)
  const client = useQueryClient()
  return useMutation({ mutationFn: (input: SchedulerMutation) => {
    if (!tenantId) throw new Error('No hay una empresa activa')
    return saveScheduler(tenantId, input)
  }, retry: false, onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['schedulers', tenantId] }), client.invalidateQueries({ queryKey: ['public-catalog', slug] })]) } })
}
