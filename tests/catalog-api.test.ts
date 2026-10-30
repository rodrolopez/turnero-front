import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'

const auth = vi.hoisted(() => ({ accessToken: 'test-session', tenantId: '22222222-2222-4222-8222-222222222222', logout: vi.fn() }))
vi.mock('../src/stores/useAuthStore', () => ({ useAuthStore: { getState: () => auth } }))
import { api } from '../src/api/client'
import { branchesResource, professionalsResource, servicesResource } from '../src/features/catalog/api'

const tenantId = '11111111-1111-4111-8111-111111111111'
const id = '33333333-3333-4333-8333-333333333333'
const branch = { id, name: 'Centro', address: null, timezone: 'America/Argentina/Buenos_Aires', is_active: true }
const requests: InternalAxiosRequestConfig[] = []
let data: unknown
beforeEach(() => {
  requests.length = 0
  api.defaults.adapter = async (config) => { requests.push(config); return { config, data, status: 200, statusText: 'OK', headers: {} } }
})
describe('Contrato HTTP de catálogos', () => {
  it('conserva el tenant de la operación aunque cambie la empresa global', async () => {
    data = { branches: [branch] }
    expect(await branchesResource.list(tenantId)).toEqual([branch])
    expect(requests[0].headers.get('X-Tenant-Id')).toBe(tenantId)
    expect(requests[0].headers.get('Authorization')).toBe('Bearer test-session')
  })
  it('crea y edita con los nombres del contrato y permite vaciar la dirección', async () => {
    data = { branch }
    const input = { name: 'Centro', address: '', timezone: branch.timezone, isActive: true }
    await branchesResource.save(tenantId, input)
    expect(requests[0].method).toBe('post')
    expect(JSON.parse(String(requests[0].data))).toEqual({ ...input, address: null })
    await branchesResource.save(tenantId, input, id)
    expect(requests[1].method).toBe('patch')
    expect(requests[1].url).toBe(`/branches/${id}`)
  })
  it('elimina mediante baja lógica sin destruir reservas o relaciones', async () => {
    data = { branch: { ...branch, is_active: false } }
    expect((await branchesResource.remove(tenantId, id)).is_active).toBe(false)
    expect(requests[0].method).toBe('patch')
    expect(JSON.parse(String(requests[0].data))).toEqual({ isActive: false })
  })
  it('permite desvincular una cuenta profesional sin enviar un UUID vacío', async () => {
    data = { professional: { id, display_name: 'Ana', user_id: null, is_active: true } }
    await professionalsResource.save(tenantId, { displayName: 'Ana', userId: '', isActive: true }, id)
    expect(JSON.parse(String(requests[0].data)).userId).toBeNull()
  })
  it('rechaza respuestas inválidas sin devolver un catálogo vacío ficticio', async () => {
    data = { services: [{ id, name: 'Corte', duration_minutes: '30', price: '1000.00', is_active: true }] }
    await expect(servicesResource.list(tenantId)).rejects.toThrow()
    data = {}
    await expect(branchesResource.list(tenantId)).rejects.toThrow()
  })
})
