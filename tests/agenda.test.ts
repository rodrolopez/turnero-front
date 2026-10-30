import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
vi.mock('../src/stores/useAuthStore', () => ({ useAuthStore: { getState: () => ({ accessToken: 'admin-session', tenantId: 'different-active-tenant', logout: vi.fn() }) } }))
import { api } from '../src/api/client'
import { fetchAgenda, manageAppointment } from '../src/features/agenda/api'
import { agendaRange, displayStatus, occursOnDay } from '../src/features/agenda/utils'
import type { AgendaAppointment } from '../src/features/agenda/schemas'

const id = '11111111-1111-4111-8111-111111111111'
const appointment: AgendaAppointment = { id, status: 'pending', paymentStatus: 'pending', observations: null, holdExpiresAt: '2030-01-01T12:00:00Z', startsAt: '2030-01-02T02:30:00Z', endsAt: '2030-01-02T03:00:00Z', branch: { id, name: 'Centro', timezone: 'America/Argentina/Buenos_Aires' }, customer: { displayName: 'Cliente', email: 'cliente@example.invalid', phone: null }, items: [{ id, serviceId: id, serviceName: 'Corte', professionalId: id, professionalName: 'Ana', startsAt: '2030-01-02T02:30:00Z', endsAt: '2030-01-02T03:00:00Z', durationMinutes: 30, price: '100.00' }] }
const requests: InternalAxiosRequestConfig[] = []
let data: unknown
beforeEach(() => {
  requests.length = 0
  api.defaults.adapter = async (config) => { requests.push(config); return { config, data, status: 200, statusText: 'OK', headers: {} } }
})
describe('Fechas y estados de agenda', () => {
  it('la semana empieza en lunes y puede cruzar mes o año', () => {
    const range = agendaRange('2027-01-03', 'week')
    expect(range?.startDate).toBe('2026-12-28')
    expect(range?.endDate).toBe('2027-01-03')
    expect(range?.days).toHaveLength(7)
    expect(agendaRange('2030-02-30', 'day')).toBeNull()
    expect(agendaRange('', 'week')).toBeNull()
  })
  it('agrupa por fecha local y excluye el extremo final a medianoche', () => {
    expect(occursOnDay(appointment, '2030-01-01')).toBe(true)
    expect(occursOnDay(appointment, '2030-01-02')).toBe(false)
    expect(occursOnDay({ ...appointment, endsAt: '2030-01-02T03:30:00Z' }, '2030-01-02')).toBe(true)
  })
  it('no ofrece confirmar una reserva cuyo hold venció', () => {
    expect(displayStatus(appointment, Date.parse('2030-01-01T11:59:00Z'))).toBe('pending')
    expect(displayStatus(appointment, Date.parse('2030-01-01T12:00:00Z'))).toBe('expired')
    expect(displayStatus({ ...appointment, status: 'confirmed' }, Date.parse('2030-01-05T00:00:00Z'))).toBe('confirmed')
  })
})
describe('Contrato HTTP de agenda', () => {
  it('envía el tenant capturado y los filtros, incluyendo paginación', async () => {
    data = { appointments: [appointment], pagination: { total: 1, limit: 100, offset: 0 } }
    const filters = { branchId: id, startDate: '2030-01-01', endDate: '2030-01-07', limit: 100, offset: 0 }
    expect((await fetchAgenda(id, filters)).appointments).toHaveLength(1)
    expect(requests[0].params).toEqual(filters)
    expect(requests[0].headers.get('X-Tenant-Id')).toBe(id)
    expect(requests[0].headers.get('Authorization')).toBe('Bearer admin-session')
  })
  it('omite branchId para consultar todas las sucursales', async () => {
    data = { appointments: [], pagination: { total: 0, limit: 100, offset: 0 } }
    await fetchAgenda(id, { branchId: '', startDate: '2030-01-01', endDate: '2030-01-01', limit: 100, offset: 0 })
    expect(requests[0].params).not.toHaveProperty('branchId')
  })
  it('confirma y cancela usando los endpoints transaccionales', async () => {
    for (const action of ['confirm', 'cancel'] as const) {
      data = { appointmentId: id, status: action === 'confirm' ? 'confirmed' : 'cancelled' }
      await manageAppointment(id, id, action)
      expect(requests.at(-1)?.url).toBe(`/appointments/${id}/${action}`)
      expect(requests.at(-1)?.method).toBe('post')
    }
  })
  it('rechaza listados incompletos y respuestas que no coinciden con la acción', async () => {
    data = { appointments: [] }
    await expect(fetchAgenda(id, { branchId: '', startDate: '2030-01-01', endDate: '2030-01-01', offset: 0, limit: 100 })).rejects.toThrow()
    data = { appointmentId: id, status: 'pending' }
    await expect(manageAppointment(id, id, 'confirm')).rejects.toThrow()
  })
})
