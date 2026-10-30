import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import { createdTenantSchema, tenantsResponseSchema, type CreateTenantInput } from '../lib/schemas'
import { useAuthStore } from '../stores/useAuthStore'

export function useTenants() {
  const userId = useAuthStore((state) => state.user?.id)
  const accessToken = useAuthStore((state) => state.accessToken)
  return useQuery({
    queryKey: ['tenants', userId],
    enabled: Boolean(accessToken && userId),
    queryFn: async ({ signal }) => tenantsResponseSchema.parse((await api.get<unknown>('/tenants/me', { signal })).data).tenants,
    staleTime: 30_000,
    retry: false,
  })
}
export async function createTenant(input: CreateTenantInput) {
  const { tenant, role } = createdTenantSchema.parse((await api.post<unknown>('/tenants', input)).data)
  return { ...tenant, role }
}
