import { useQueries } from '@tanstack/react-query'
import { professionalsResource, useCatalog } from '../catalog/api'
import { fetchAssignments } from '../hours/api'
import { useAuthStore } from '../../stores/useAuthStore'

export function useAgendaProfessionals(branchId: string) {
  const tenantId = useAuthStore((state) => state.tenantId)
  const catalog = useCatalog(professionalsResource)
  const active = catalog.data?.filter((professional) => professional.is_active) ?? []
  const queries = useQueries({ queries: branchId ? active.map((professional) => ({
    queryKey: ['catalog', tenantId, 'assignments', professional.id],
    enabled: Boolean(tenantId),
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchAssignments(tenantId!, professional.id, signal),
    staleTime: 30_000, retry: false,
  })) : [] })
  const error = catalog.error ?? queries.find((query) => query.isError)?.error
  return {
    catalog: catalog.data ?? [],
    assigned: active.filter((_, index) => !branchId || queries[index]?.data?.branchIds.includes(branchId)).map((professional) => ({ id: professional.id, name: professional.display_name })),
    isPending: catalog.isPending || queries.some((query) => query.isPending),
    error,
    refetch: () => { void catalog.refetch(); queries.forEach((query) => { void query.refetch() }) },
  }
}
