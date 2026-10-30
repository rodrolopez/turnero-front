import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/useAuthStore'
import type { Tenant } from '../../lib/schemas'
import * as s from './schemas'

type Role = Tenant['role']
const owner: Role[] = ['OWNER']
const cashier: Role[] = ['OWNER', 'ADMIN']
const personal: Role[] = ['OWNER', 'STAFF']
function useFinanceQuery<T>(key: unknown[], allowed: Role[], fetch: (tenantId: string, signal: AbortSignal) => Promise<T>) {
  const { tenantId, tenantRole, user } = useAuthStore()
  return useQuery({ queryKey: ['finance', tenantId, tenantRole, user?.id, ...key], enabled: Boolean(tenantId && tenantRole && allowed.includes(tenantRole)), queryFn: ({ signal }) => fetch(tenantId!, signal), retry: false, staleTime: 0, refetchInterval: 30_000 })
}
const options = (tenantId: string, signal?: AbortSignal) => ({ headers: { 'X-Tenant-Id': tenantId }, signal })
export function useContracts() {
  return useFinanceQuery(['contracts'], owner, async (tenantId, signal) => s.contractsResponseSchema.parse((await api.get<unknown>('/finance/contracts', options(tenantId, signal))).data).contracts)
}
export function useBalances(professionalId?: string) {
  return useFinanceQuery(['balances', professionalId ?? 'own-or-all'], personal, async (tenantId, signal) => s.balancesResponseSchema.parse((await api.get<unknown>('/finance/settlements/balances', { ...options(tenantId, signal), params: professionalId ? { professionalId } : {} })).data).balances)
}
export function useSummary() {
  return useFinanceQuery(['summary'], owner, async (tenantId, signal) => s.summarySchema.parse((await api.get<unknown>('/finance/summary', options(tenantId, signal))).data))
}
export function useTransactions(offset: number, professionalId: string) {
  return useFinanceQuery(['transactions', offset, professionalId], owner, async (tenantId, signal) => s.transactionsResponseSchema.parse((await api.get<unknown>('/finance/transactions', { ...options(tenantId, signal), params: { limit: 50, offset, ...(professionalId ? { professionalId } : {}) } })).data))
}
export function usePersonalTransactions(offset: number, professionalId: string, enabled: boolean) {
  return useFinanceQuery(['personal-transactions', offset, professionalId], enabled ? ['STAFF'] : [], async (tenantId, signal) => {
    const page = s.personalTransactionsResponseSchema.parse((await api.get<unknown>('/finance/transactions', { ...options(tenantId, signal), params: { limit: 50, offset, professionalId } })).data)
    if (page.entries.some((entry) => entry.professional_id !== professionalId)) throw new Error('La respuesta contiene movimientos de otro profesional')
    return page
  })
}
export function useFinanceMutation<Input, Output>(allowed: Role[], operation: (tenantId: string, input: Input) => Promise<Output>) {
  const { tenantId, tenantRole } = useAuthStore()
  const client = useQueryClient()
  return useMutation({ mutationFn: (input: Input) => {
    const current = useAuthStore.getState()
    if (!tenantId || current.tenantId !== tenantId || current.tenantRole !== tenantRole || !tenantRole || !allowed.includes(tenantRole)) throw new Error('La sesión o los permisos cambiaron. Actualizá la página.')
    return operation(tenantId, input)
  }, retry: false, onSettled: async () => { await Promise.all([
    client.invalidateQueries({ queryKey: ['finance', tenantId] }), client.invalidateQueries({ queryKey: ['statistics', tenantId] }),
    client.invalidateQueries({ queryKey: ['agenda', tenantId] }),
    client.invalidateQueries({ queryKey: ['public-availability'] }), client.invalidateQueries({ queryKey: ['availability', tenantId] }),
  ]) } })
}
export function useCheckout() {
  return useFinanceMutation(cashier, async (tenantId, input: { id: string; payload: s.CheckoutInput }) => {
    const result = s.receiptSchema.parse((await api.post<unknown>(`/finance/checkout/${input.id}`, s.checkoutInputSchema.parse(input.payload), options(tenantId))).data)
    if (result.appointmentId !== input.id) throw new Error('La respuesta no corresponde al turno')
    return result
  })
}
export function useWalkIn() {
  return useFinanceMutation(cashier, async (tenantId, input: { payload: s.WalkInInput; key: string }) => s.receiptSchema.parse((await api.post<unknown>('/appointments/walk-in', s.walkInInputSchema.parse(input.payload), { headers: { 'X-Tenant-Id': tenantId, 'Idempotency-Key': input.key } })).data))
}
export function useSaveContract() {
  return useFinanceMutation(owner, async (tenantId, input: { id?: string; payload: s.ContractInput }) => s.contractResponseSchema.parse((await api.request<unknown>({ ...options(tenantId), method: input.id ? 'PUT' : 'POST', url: input.id ? `/finance/contracts/${input.id}` : '/finance/contracts', data: s.contractInputSchema.parse(input.payload) })).data).contract)
}
export function useDeactivateContract() {
  return useFinanceMutation(owner, async (tenantId, id: string) => s.contractResponseSchema.parse((await api.delete<unknown>(`/finance/contracts/${id}`, options(tenantId))).data).contract)
}
export function usePayout() {
  return useFinanceMutation(owner, async (tenantId, input: { payload: s.PayoutInput; key: string }) => s.payoutResponseSchema.parse((await api.post<unknown>('/finance/settlements/payout', s.payoutInputSchema.parse(input.payload), { headers: { 'X-Tenant-Id': tenantId, 'Idempotency-Key': input.key } })).data).settlement)
}
export function useVoid() {
  return useFinanceMutation(owner, async (tenantId, input: { id: string; reason: string }) => s.voidResponseSchema.parse((await api.post<unknown>(`/finance/transactions/${input.id}/void`, s.voidInputSchema.parse({ reason: input.reason }), options(tenantId))).data))
}
