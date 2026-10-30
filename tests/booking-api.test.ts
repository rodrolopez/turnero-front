import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
vi.mock('../src/stores/useAuthStore', () => ({ useAuthStore: { getState: () => ({ accessToken: 'admin-session', tenantId: 'admin-tenant', logout: vi.fn() }) } }))
import { api } from '../src/api/client'
import { submitPublicBooking } from '../src/features/booking/api'
import { createBookingAttempt, isSlotConflict } from '../src/features/booking/attempt'
import type { BookingRequest } from '../src/features/booking/schemas'

const id = '11111111-1111-4111-8111-111111111111'
const payload: BookingRequest = { branchId: id, schedulerId: id, startsAt: '2030-01-02T12:00:00.000Z', items: [{ serviceId: id, professionalSelection: { mode: 'any' } }], customer: { displayName: 'Cliente', email: 'cliente@example.invalid', phone: null } }
const response = { appointment: { id, status: 'confirmed', holdExpiresAt: null, branchId: id, schedulerId: id, items: [{ id, serviceId: id, professionalId: id, startsAt: payload.startsAt, endsAt: '2030-01-02T12:30:00.000Z', durationMinutes: 30, price: '10.00', serviceName: 'Corte' }] } }
const requests: InternalAxiosRequestConfig[] = []
beforeEach(() => {
  requests.length = 0
  api.defaults.adapter = async (config) => { requests.push(config); return { config, data: response, status: 201, statusText: 'Created', headers: {} } }
})
describe('Reserva pública HTTP', () => {
  it('envía any sin profesional fijo y no filtra credenciales del administrador', async () => {
    const attempt = createBookingAttempt().forPayload(payload)
    await submitPublicBooking('barberia-central', payload, attempt.idempotencyKey)
    expect(requests[0].url).toBe('/public/barberia-central/appointments')
    expect(requests[0].headers.get('Authorization')).toBeUndefined()
    expect(requests[0].headers.get('X-Tenant-Id')).toBeUndefined()
    expect(requests[0].headers.get('Idempotency-Key')).toBe(attempt.idempotencyKey)
    expect(JSON.parse(String(requests[0].data)).items[0].professionalSelection).toEqual({ mode: 'any' })
  })
  it('conserva la elección de un profesional específico', async () => {
    const specific: BookingRequest = { ...payload, items: [{ serviceId: id, professionalSelection: { mode: 'specific', professionalId: id } }] }
    await submitPublicBooking('barberia', specific, createBookingAttempt().forPayload(specific).idempotencyKey)
    expect(JSON.parse(String(requests[0].data)).items[0].professionalSelection).toEqual({ mode: 'specific', professionalId: id })
  })
  it('reintenta una respuesta perdida con el mismo body y la misma clave', async () => {
    const attempt = createBookingAttempt()
    let count = 0
    api.defaults.adapter = async (config) => {
      requests.push(config)
      if (++count === 1) throw new AxiosError('Network Error', 'ERR_NETWORK', config)
      return { config, data: response, status: 201, statusText: 'Created', headers: {} }
    }
    const request = attempt.forPayload(payload)
    await expect(submitPublicBooking('barberia', request.payload, request.idempotencyKey)).rejects.toThrow()
    const retry = attempt.forPayload(payload)
    expect((await submitPublicBooking('barberia', retry.payload, retry.idempotencyKey)).appointment.id).toBe(id)
    expect(requests[0].data).toBe(requests[1].data)
    expect(requests[0].headers.get('Idempotency-Key')).toBe(requests[1].headers.get('Idempotency-Key'))
  })
  it('propaga el 409 para recuperar la selección de horario', async () => {
    api.defaults.adapter = async (config) => { throw new AxiosError('Conflict', undefined, config, undefined, { config, data: { error: 'El horario seleccionado acaba de ser ocupado', code: '23P01' }, status: 409, statusText: 'Conflict', headers: {} }) }
    try { await submitPublicBooking('barberia', payload, createBookingAttempt().forPayload(payload).idempotencyKey); expect.fail('Debió rechazar el conflicto') } catch (error) { expect(isSlotConflict(error)).toBe(true) }
  })
})
