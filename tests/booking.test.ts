import { describe, expect, it } from 'vitest'
import { validate as validUuid, version } from 'uuid'
import { AxiosError, AxiosHeaders } from 'axios'
import { createBookingAttempt, isSlotConflict, isUncertainResult } from '../src/features/booking/attempt'
import { availableStarts, dateInZone, eligibleProfessionals, timeInZone } from '../src/features/booking/utils'
import { customerSchema, publicCatalogSchema, type BookingRequest, type PublicProfessional, type PublicScheduler } from '../src/features/booking/schemas'

const branch = '11111111-1111-4111-8111-111111111111'
const service = '22222222-2222-4222-8222-222222222222'
const professional = '33333333-3333-4333-8333-333333333333'
const second = '44444444-4444-4444-8444-444444444444'
const payload: BookingRequest = { branchId: branch, schedulerId: service, startsAt: '2030-01-02T12:00:00.000Z', items: [{ serviceId: service, professionalSelection: { mode: 'any' } }], customer: { displayName: 'Cliente', email: 'cliente@example.invalid', phone: null } }
const professionals: PublicProfessional[] = [
  { id: professional, display_name: 'Ana', branchIds: [branch], serviceIds: [service], bookingOptions: [{ branchId: branch, serviceId: service }] },
  { id: second, display_name: 'Luis', branchIds: [branch], serviceIds: [service], bookingOptions: [{ branchId: branch, serviceId: service }] },
]
const scheduler: PublicScheduler = { id: service, name: 'Agenda', branch_id: branch, requires_approval: false, hold_duration_minutes: 30, professionalIds: null }

describe('Idempotencia de reservas', () => {
  it('genera un UUID v4 fresco para cada nueva reserva', () => {
    const first = createBookingAttempt().forPayload(payload).idempotencyKey
    const second = createBookingAttempt().forPayload(payload).idempotencyKey
    expect(validUuid(first)).toBe(true)
    expect(version(first)).toBe(4)
    expect(second).not.toBe(first)
  })
  it('conserva la misma clave al reintentar exactamente el mismo envío', () => {
    const attempt = createBookingAttempt()
    expect(attempt.forPayload(structuredClone(payload)).idempotencyKey).toBe(attempt.forPayload(payload).idempotencyKey)
  })
  it('renueva la clave si cambian el horario o los datos del cliente', () => {
    const attempt = createBookingAttempt()
    const first = attempt.forPayload(payload).idempotencyKey
    const changed = attempt.forPayload({ ...payload, startsAt: '2030-01-02T13:00:00.000Z' }).idempotencyKey
    expect(changed).not.toBe(first)
    expect(attempt.forPayload({ ...payload, customer: { ...payload.customer, displayName: 'Otra persona' } }).idempotencyKey).not.toBe(changed)
  })
  it('diferencia un conflicto definitivo de una respuesta de red incierta', () => {
    const config = { headers: new AxiosHeaders() }
    const conflict = new AxiosError('Conflict', undefined, config, undefined, { status: 409, data: {}, headers: {}, statusText: 'Conflict', config })
    expect(isSlotConflict(conflict)).toBe(true)
    expect(isUncertainResult(conflict)).toBe(false)
    expect(isUncertainResult(new AxiosError('Network Error'))).toBe(true)
  })
})
describe('Disponibilidad pública', () => {
  it('filtra profesionales por sucursal, servicio y restricciones de agenda', () => {
    expect(eligibleProfessionals(professionals, branch, service, scheduler)).toHaveLength(2)
    expect(eligibleProfessionals(professionals, branch, service, { ...scheduler, professionalIds: [professional] })).toEqual([professionals[0]])
    expect(eligibleProfessionals(professionals, branch, service, { ...scheduler, professionalIds: [] })).toEqual([])
    expect(eligibleProfessionals(professionals, second, service, scheduler)).toEqual([])
  })
  it('oculta profesionales sin horarios compatibles con la sucursal y el servicio', () => {
    const noHours = { ...professionals[0], bookingOptions: [] }
    const otherBranch = { ...professionals[1], bookingOptions: [{ branchId: second, serviceId: service }] }
    expect(eligibleProfessionals([noHours, otherBranch], branch, service, scheduler)).toEqual([])
    expect(eligibleProfessionals([noHours, professionals[1]], branch, service, scheduler)).toEqual([professionals[1]])
  })
  it('deduplica instantes para any y conserva el filtro specific', () => {
    const slots = professionals.map((person) => ({ startAt: payload.startsAt, endAt: '2030-01-02T12:30:00.000Z', professionalId: person.id, professionalName: person.display_name }))
    expect(availableStarts(slots, professionals, { mode: 'any' }, 0)).toHaveLength(1)
    expect(availableStarts(slots, professionals, { mode: 'specific', professionalId: second }, 0)[0].professionalId).toBe(second)
    expect(availableStarts(slots, [professionals[0]], { mode: 'specific', professionalId: second }, 0)).toEqual([])
    expect(availableStarts(slots, professionals, { mode: 'any' }, Date.parse('2030-01-03T00:00:00Z'))).toEqual([])
  })
  it('usa la fecha de la sucursal aunque el UTC o el navegador estén en otro día', () => {
    const instant = new Date('2030-01-02T01:00:00Z')
    expect(dateInZone('America/Argentina/Buenos_Aires', instant)).toBe('2030-01-01')
    expect(timeInZone(instant.toISOString(), 'America/Argentina/Buenos_Aires')).toBe('22:00')
    expect(dateInZone('Asia/Tokyo', instant)).toBe('2030-01-02')
  })
})
describe('Contratos y datos del cliente', () => {
  it('normaliza nombre y correo y permite omitir teléfono', () => {
    expect(customerSchema.parse({ displayName: ' Ana ', email: ' ANA@EXAMPLE.INVALID ', phone: '' })).toEqual({ displayName: 'Ana', email: 'ana@example.invalid', phone: '' })
    expect(customerSchema.safeParse({ displayName: '', email: 'invalido', phone: 'abc' }).success).toBe(false)
  })
  it('no inventa agendas cuando el catálogo no las incluye', () => {
    expect(publicCatalogSchema.safeParse({ branches: [], services: [], professionals: [] }).success).toBe(false)
  })
})
