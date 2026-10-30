import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/useAuthStore'
import { useCatalogMutation } from '../catalog/api'
import { branchHoursResponseSchema, assignmentsResponseSchema, type BranchHoursInput, type AssignmentsInput } from './schemas'

export function useBranchHours(branchId: string) {
  const tenantId = useAuthStore((state) => state.tenantId)
  return useQuery({
    queryKey: ['catalog', tenantId, 'branch-hours', branchId], enabled: Boolean(tenantId),
    queryFn: async ({ signal }) => branchHoursResponseSchema.parse((await api.get<unknown>(`/branches/${branchId}/hours`, { signal, headers: { 'X-Tenant-Id': tenantId } })).data),
  })
}
export function useSaveBranchHours(branchId: string) {
  return useCatalogMutation(async (tenantId, input: BranchHoursInput) => branchHoursResponseSchema.parse((await api.put<unknown>(`/branches/${branchId}/hours`, input, { headers: { 'X-Tenant-Id': tenantId } })).data))
}
export async function fetchAssignments(tenantId: string, professionalId: string, signal?: AbortSignal) {
  return assignmentsResponseSchema.parse((await api.get<unknown>(`/professionals/${professionalId}/assignments`, { signal, headers: { 'X-Tenant-Id': tenantId } })).data).assignments
}
export function useAssignments(professionalId: string) {
  const tenantId = useAuthStore((state) => state.tenantId)
  return useQuery({
    queryKey: ['catalog', tenantId, 'assignments', professionalId], enabled: Boolean(tenantId),
    queryFn: ({ signal }) => fetchAssignments(tenantId!, professionalId, signal),
  })
}
export function useSaveAssignments(professionalId: string) {
  return useCatalogMutation(async (tenantId, input: AssignmentsInput) => assignmentsResponseSchema.parse((await api.put<unknown>(`/professionals/${professionalId}/assignments`, input, { headers: { 'X-Tenant-Id': tenantId } })).data).assignments)
}
