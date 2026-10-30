import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/useAuthStore'
import { branchSchema, serviceSchema, professionalSchema, type BranchInput, type ServiceInput, type ProfessionalInput } from './schemas'

export interface CatalogEntity { id: string; is_active: boolean }
export interface CatalogResource<TEntity extends CatalogEntity, TInput> {
  key: string
  list: (tenantId: string, signal?: AbortSignal) => Promise<TEntity[]>
  save: (tenantId: string, input: TInput, id?: string) => Promise<TEntity>
  remove: (tenantId: string, id: string) => Promise<TEntity>
}
function resource<TEntity extends CatalogEntity, TInput>(
  key: string, singular: string, schema: z.ZodType<TEntity>, payload: (input: TInput) => unknown,
): CatalogResource<TEntity, TInput> {
  function extract(data: unknown): TEntity {
    return schema.parse(z.record(z.string(), z.unknown()).parse(data)[singular])
  }
  return {
    key,
    list: async (tenantId, signal) => {
      const response = await api.get<unknown>(`/${key}`, { signal, headers: { 'X-Tenant-Id': tenantId } })
      return z.array(schema).parse(z.record(z.string(), z.unknown()).parse(response.data)[key])
    },
    save: async (tenantId, input, id) => {
      const response = await api.request<unknown>({ url: id ? `/${key}/${id}` : `/${key}`, method: id ? 'PATCH' : 'POST', data: payload(input), headers: { 'X-Tenant-Id': tenantId } })
      return extract(response.data)
    },
    // Logical deletion preserves references from existing appointments.
    remove: async (tenantId, id) => extract((await api.patch<unknown>(`/${key}/${id}`, { isActive: false }, { headers: { 'X-Tenant-Id': tenantId } })).data),
  }
}
export const branchesResource = resource('branches', 'branch', branchSchema, (input: BranchInput) => ({ ...input, address: input.address || null }))
export const servicesResource = resource('services', 'service', serviceSchema, (input: ServiceInput) => input)
export const professionalsResource = resource('professionals', 'professional', professionalSchema, (input: ProfessionalInput) => useAuthStore.getState().tenantRole === 'ADMIN' ? { displayName: input.displayName } : ({ ...input, userId: input.userId || null }))

export function useCatalog<TEntity extends CatalogEntity, TInput>(resource: CatalogResource<TEntity, TInput>) {
  const tenantId = useAuthStore((state) => state.tenantId)
  const role = useAuthStore((state) => state.tenantRole)
  const userId = useAuthStore((state) => state.user?.id)
  return useQuery({
    queryKey: ['catalog', tenantId, resource.key, role, userId], enabled: Boolean(tenantId),
    queryFn: ({ signal }) => resource.list(tenantId!, signal), staleTime: 30_000,
  })
}
export function useCatalogMutation<TInput, TResult>(operation: (tenantId: string, input: TInput) => Promise<TResult>) {
  const tenantId = useAuthStore((state) => state.tenantId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TInput) => {
      if (!tenantId) throw new Error('No hay una empresa activa')
      return operation(tenantId, input)
    },
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['catalog', tenantId] }), queryClient.invalidateQueries({ queryKey: ['public-catalog'] }), queryClient.invalidateQueries({ queryKey: ['public-availability'] })]) },
  })
}
