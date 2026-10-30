import { describe, expect, it } from 'vitest'
import { branchFormSchema, serviceFormSchema, professionalFormSchema } from '../src/features/catalog/schemas'
import { assignmentsFormSchema, assignmentsResponseSchema, branchHoursFormSchema, branchHoursResponseSchema } from '../src/features/hours/schemas'

const branch = '11111111-1111-4111-8111-111111111111'
const otherBranch = '22222222-2222-4222-8222-222222222222'
const morning = { weekday: 1, startsAt: '09:00', endsAt: '12:00' }
describe('Horarios semanales', () => {
  it('permite cerrar todos los días y varios turnos consecutivos', () => {
    expect(branchHoursFormSchema.safeParse({ hours: [] }).success).toBe(true)
    expect(branchHoursFormSchema.safeParse({ hours: [morning, { ...morning, startsAt: '12:00', endsAt: '18:00' }] }).success).toBe(true)
  })
  it('rechaza intervalos invertidos, nocturnos y superpuestos', () => {
    for (const entry of [{ ...morning, endsAt: '09:00' }, { ...morning, startsAt: '22:00', endsAt: '06:00' }, { ...morning, startsAt: '25:00' }]) {
      expect(branchHoursFormSchema.safeParse({ hours: [entry] }).success).toBe(false)
    }
    const result = branchHoursFormSchema.safeParse({ hours: [morning, { ...morning, startsAt: '11:00', endsAt: '13:00' }] })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0].path).toEqual(['hours', 1, 'startsAt'])
  })
  it('usa domingo=0 y lunes=1 como el backend, y rechaza el día 7', () => {
    expect(branchHoursFormSchema.safeParse({ hours: [{ ...morning, weekday: 0 }] }).success).toBe(true)
    expect(branchHoursFormSchema.safeParse({ hours: [{ ...morning, weekday: 7 }] }).success).toBe(false)
  })
  it('exige una sucursal asignada para cada tramo profesional', () => {
    const input = { branchIds: [branch], serviceIds: [], workingHours: [{ ...morning, branchId: otherBranch }] }
    const result = assignmentsFormSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0].path).toEqual(['workingHours', 0, 'branchId'])
    expect(assignmentsFormSchema.safeParse({ ...input, branchIds: [branch, otherBranch] }).success).toBe(true)
  })
  it('rechaza superposición en una sucursal y permite tramos de días diferentes', () => {
    const input = { branchIds: [branch], serviceIds: [], workingHours: [{ ...morning, branchId: branch }, { ...morning, branchId: branch }] }
    expect(assignmentsFormSchema.safeParse(input).success).toBe(false)
    expect(assignmentsFormSchema.safeParse({ ...input, workingHours: [input.workingHours[0], { ...input.workingHours[1], weekday: 2 }] }).success).toBe(true)
  })
  it('preserva todas las sucursales y servicios al normalizar la respuesta', () => {
    const response = { assignments: { branchIds: [branch, otherBranch], serviceIds: [branch], workingHours: [{ branch_id: branch, weekday: 1, starts_at: '09:00:00', ends_at: '12:00:00' }, { branch_id: otherBranch, weekday: 2, starts_at: '15:00:00', ends_at: '18:00:00' }] } }
    const parsed = assignmentsResponseSchema.parse(response).assignments
    expect(parsed.branchIds).toEqual(response.assignments.branchIds)
    expect(parsed.serviceIds).toEqual(response.assignments.serviceIds)
    expect(parsed.workingHours).toHaveLength(2)
    expect(parsed.workingHours[0]).toEqual({ branchId: branch, ...morning })
    expect(assignmentsFormSchema.safeParse(parsed).success).toBe(true)
  })
  it('rechaza respuestas inesperadas en vez de sustituir horarios por una lista vacía', () => {
    expect(branchHoursResponseSchema.safeParse({}).success).toBe(false)
    expect(assignmentsResponseSchema.safeParse({ assignments: { branchIds: [], workingHours: [] } }).success).toBe(false)
    expect(branchHoursResponseSchema.safeParse({ hours: [{ weekday: 1, starts_at: '09:00:30', ends_at: '12:00:00' }] }).success).toBe(false)
  })
})
describe('Formularios de catálogo', () => {
  it('valida la duración y la precisión del precio de los servicios', () => {
    const input = { name: 'Corte', durationMinutes: 30, price: 1000.5, isActive: true }
    expect(serviceFormSchema.safeParse(input).success).toBe(true)
    for (const invalid of [{ durationMinutes: 20 }, { price: -1 }, { price: 1.234 }, { price: NaN }]) {
      expect(serviceFormSchema.safeParse({ ...input, ...invalid }).success).toBe(false)
    }
  })
  it('rechaza zonas horarias inexistentes y UUIDs inválidos', () => {
    expect(branchFormSchema.safeParse({ name: 'Centro', address: '', timezone: 'No/Existe', isActive: true }).success).toBe(false)
    expect(professionalFormSchema.safeParse({ displayName: 'Ana', userId: '', isActive: true }).success).toBe(true)
    expect(professionalFormSchema.safeParse({ displayName: 'Ana', userId: 'incorrecto', isActive: true }).success).toBe(false)
  })
})
