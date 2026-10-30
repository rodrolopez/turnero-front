import { describe, expect, it } from 'vitest'
import { buildTimeGridEvents, colorByProfessional, eventGeometry, GRID_PADDING, layoutOverlaps, mergeGridProfessionals, PIXELS_PER_MINUTE, timeGridBounds } from '../src/features/agenda/timeGrid'
import type { AgendaAppointment } from '../src/features/agenda/schemas'

const appointment: AgendaAppointment = {
  id: 'booking', status: 'confirmed', paymentStatus: 'pending', observations: null, holdExpiresAt: null, startsAt: '2030-01-02T12:00:00Z', endsAt: '2030-01-02T13:00:00Z',
  branch: { id: 'branch', name: 'Centro', timezone: 'America/Argentina/Buenos_Aires' }, customer: { displayName: 'Cliente', email: 'cliente@example.invalid', phone: null },
  items: [
    { id: 'cut', serviceId: 'cut', serviceName: 'Corte', professionalId: 'ana', professionalName: 'Ana', startsAt: '2030-01-02T12:00:00Z', endsAt: '2030-01-02T12:30:00Z', durationMinutes: 30, price: '100.00' },
    { id: 'beard', serviceId: 'beard', serviceName: 'Barba', professionalId: 'luis', professionalName: 'Luis', startsAt: '2030-01-02T12:30:00Z', endsAt: '2030-01-02T13:00:00Z', durationMinutes: 30, price: '50.00' },
  ],
}
describe('Geometría de la grilla horaria', () => {
  it('posiciona cada servicio en minutos locales y conserva su profesional', () => {
    const events = buildTimeGridEvents([appointment], ['2030-01-02'])
    expect(events.map((event) => [event.item.professionalId, event.startMinute, event.endMinute])).toEqual([['ana', 540, 570], ['luis', 570, 600]])
    expect(eventGeometry(events[0], 480)).toEqual({ top: GRID_PADDING + 60 * PIXELS_PER_MINUTE, height: 30 * PIXELS_PER_MINUTE - 2 })
    expect(buildTimeGridEvents([appointment], ['2030-01-02'], 'luis')).toHaveLength(1)
  })
  it('divide tramos que cruzan medianoche y no duplica un fin exacto de día', () => {
    const item = { ...appointment.items[0], startsAt: '2030-01-03T02:30:00Z', endsAt: '2030-01-03T03:30:00Z' }
    const booking = { ...appointment, items: [item] }
    const events = buildTimeGridEvents([booking], ['2030-01-02', '2030-01-03'])
    expect(events.map((event) => [event.day, event.startMinute, event.endMinute])).toEqual([['2030-01-02', 1410, 1440], ['2030-01-03', 0, 30]])
    expect(buildTimeGridEvents([{ ...booking, items: [{ ...item, endsAt: '2030-01-03T03:00:00Z' }] }], ['2030-01-03'])).toEqual([])
  })
  it('amplía el eje horario para no recortar turnos tempranos o nocturnos', () => {
    expect(timeGridBounds([])).toEqual({ startMinute: 480, endMinute: 1320 })
    const events = buildTimeGridEvents([{ ...appointment, items: [{ ...appointment.items[0], startsAt: '2030-01-03T02:30:00Z', endsAt: '2030-01-03T03:30:00Z' }] }], ['2030-01-02', '2030-01-03'])
    expect(timeGridBounds(events)).toEqual({ startMinute: 0, endMinute: 1440 })
  })
})
describe('Distribución de turnos simultáneos', () => {
  it('separa los intervalos superpuestos en carriles y reutiliza carriles libres', () => {
    const events = [
      { id: 'a', startMinute: 540, endMinute: 600 },
      { id: 'b', startMinute: 570, endMinute: 630 },
      { id: 'c', startMinute: 600, endMinute: 660 },
      { id: 'd', startMinute: 700, endMinute: 730 },
    ]
    const layout = layoutOverlaps(events)
    expect(layout.map((event) => [event.id, event.lane, event.laneCount])).toEqual([['a', 0, 2], ['b', 1, 2], ['c', 0, 2], ['d', 0, 1]])
    expect(events[0]).not.toHaveProperty('lane')
  })
  it('no considera superpuestos los turnos consecutivos', () => {
    const events = layoutOverlaps([{ id: 'a', startMinute: 540, endMinute: 570 }, { id: 'b', startMinute: 570, endMinute: 600 }])
    expect(events.every((event) => event.laneCount === 1)).toBe(true)
  })
  it('admite más de dos turnos simultáneos sin ocultarlos', () => {
    const events = layoutOverlaps(['a', 'b', 'c'].map((id) => ({ id, startMinute: 540, endMinute: 600 })))
    expect(new Set(events.map((event) => event.lane)).size).toBe(3)
    expect(events.every((event) => event.laneCount === 3)).toBe(true)
  })
})
it('mantiene colores estables al cambiar el orden y conserva profesionales históricos', () => {
  const colors = colorByProfessional(['luis', 'ana', 'ana'])
  expect(colors).toEqual(colorByProfessional(['ana', 'luis']))
  expect(colors.get('ana')).not.toBe(colors.get('luis'))
  expect(mergeGridProfessionals([{ id: 'carla', name: 'Carla' }], [appointment]).map((professional) => professional.name)).toEqual(['Ana', 'Carla', 'Luis'])
})
