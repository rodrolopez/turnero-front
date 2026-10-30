// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import { validate as validUuid } from 'uuid'
import { CustomerStep } from '../src/features/booking/CustomerStep'
import { BookingCalendar } from '../src/features/booking/Calendar'
import { BookingSuccess } from '../src/features/booking/BookingSuccess'
import type { Visit } from '../src/features/booking/BookingSummary'
import type { BookingResponse } from '../src/features/booking/schemas'
vi.mock('../src/features/booking/api', () => ({ submitPublicBooking: vi.fn() }))
import { submitPublicBooking } from '../src/features/booking/api'

const submit = vi.mocked(submitPublicBooking)
const id = '11111111-1111-4111-8111-111111111111'
const visit: Visit = {
  branch: { id, name: 'Centro', address: 'Calle de prueba', timezone: 'America/Argentina/Buenos_Aires' },
  service: { id, name: 'Corte', price: '100.00', duration_minutes: 30 },
  scheduler: { id, name: 'Agenda', branch_id: id, requires_approval: false, hold_duration_minutes: 30, professionalIds: null },
  selection: { mode: 'any' }, professionals: [{ id, display_name: 'Ana', branchIds: [id], serviceIds: [id], bookingOptions: [{ branchId: id, serviceId: id }] }], date: '2030-01-02',
  slot: { startAt: '2030-01-02T12:00:00.000Z', endAt: '2030-01-02T12:30:00.000Z', professionalId: id, professionalName: 'Ana' },
}
const response: BookingResponse = { appointment: { id, status: 'confirmed', holdExpiresAt: null, branchId: id, schedulerId: id, items: [{ id, serviceId: id, professionalId: id, startsAt: visit.slot.startAt, endsAt: visit.slot.endAt, durationMinutes: 30, price: '100.00', serviceName: 'Corte' }] } }
function httpError(status: number, message: string) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError(message, undefined, config, undefined, { status, data: { error: message }, config, headers: {}, statusText: 'Error' })
}
function setup() {
  const callbacks = { onDraft: vi.fn(), onBack: vi.fn(), onConflict: vi.fn(), onSuccess: vi.fn() }
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><CustomerStep slug="barberia" visit={visit} draft={{ displayName: 'Cliente Prueba', email: 'cliente@example.invalid', phone: '' }} {...callbacks} /></QueryClientProvider>)
  return callbacks
}
afterEach(cleanup)
beforeEach(() => vi.resetAllMocks())
describe('Formulario público de reserva', () => {
  it('un doble clic produce un solo POST y usa una clave UUID', async () => {
    let release!: (value: BookingResponse) => void
    submit.mockImplementation(() => new Promise((resolve) => { release = resolve }))
    const callbacks = setup()
    await userEvent.dblClick(screen.getByRole('button', { name: 'Reservar turno' }))
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    expect(validUuid(submit.mock.calls[0][2])).toBe(true)
    await act(async () => release(response))
    expect(callbacks.onSuccess).toHaveBeenCalledWith(response)
  })
  it('conserva los datos y vuelve a la selección de horario ante un 409', async () => {
    submit.mockRejectedValueOnce(httpError(409, 'El horario seleccionado acaba de ser ocupado'))
    const callbacks = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Reservar turno' }))
    await waitFor(() => expect(callbacks.onConflict).toHaveBeenCalledTimes(1))
    expect(callbacks.onDraft).toHaveBeenCalledWith({ displayName: 'Cliente Prueba', email: 'cliente@example.invalid', phone: '' })
    expect(callbacks.onSuccess).not.toHaveBeenCalled()
  })
  it('una respuesta perdida bloquea cambios y se verifica con la misma clave y payload', async () => {
    submit.mockRejectedValueOnce(new AxiosError('Network Error')).mockResolvedValueOnce(response)
    const callbacks = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Reservar turno' }))
    const retry = await screen.findByRole('button', { name: 'Verificar mi reserva' })
    expect(screen.getByLabelText('Nombre y apellido').matches(':disabled')).toBe(true)
    expect((screen.getByRole('button', { name: 'Volver' }) as HTMLButtonElement).disabled).toBe(true)
    await userEvent.click(retry)
    await waitFor(() => expect(callbacks.onSuccess).toHaveBeenCalledWith(response))
    expect(submit.mock.calls[0][2]).toBe(submit.mock.calls[1][2])
    expect(submit.mock.calls[0][1]).toEqual(submit.mock.calls[1][1])
  })
  it('permite corregir un error definitivo y usa otra clave para datos diferentes', async () => {
    submit.mockRejectedValueOnce(httpError(400, 'Revisá los datos del cliente')).mockResolvedValueOnce(response)
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Reservar turno' }))
    await screen.findByRole('alert')
    const field = screen.getByLabelText('Nombre y apellido')
    await userEvent.clear(field)
    await userEvent.type(field, 'Nombre corregido')
    await userEvent.click(screen.getByRole('button', { name: 'Reservar turno' }))
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2))
    expect(submit.mock.calls[0][2]).not.toBe(submit.mock.calls[1][2])
  })
  it('no envía el formulario si el correo es inválido', async () => {
    setup()
    await userEvent.clear(screen.getByLabelText('Correo electrónico'))
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'invalido')
    await userEvent.click(screen.getByRole('button', { name: 'Reservar turno' }))
    expect(await screen.findByText('Ingresá un correo válido')).toBeTruthy()
    expect(submit).not.toHaveBeenCalled()
  })
})
describe('Calendario y comprobante', () => {
  it('deshabilita fechas anteriores al día local de la sucursal', async () => {
    const change = vi.fn()
    render(<BookingCalendar today="2030-01-02" value="" onChange={change} />)
    expect((screen.getByRole('button', { name: 'martes 1 de enero' }) as HTMLButtonElement).disabled).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'miércoles 2 de enero' }))
    expect(change).toHaveBeenCalledWith('2030-01-02')
  })
  it('una reserva pendiente no se presenta como confirmada', () => {
    render(<BookingSuccess visit={visit} response={{ appointment: { ...response.appointment, status: 'pending', holdExpiresAt: '2030-01-02T11:00:00.000Z' } }} onReset={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Tu turno está pendiente de aprobación' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Tu turno está confirmado' })).toBeNull()
    expect(screen.getByText(/La solicitud vence/)).toBeTruthy()
  })
})
