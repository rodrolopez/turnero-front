// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { addDays, format, parseISO } from 'date-fns'
import PublicBookingPage from '../src/pages/PublicBookingPage'
import { api } from '../src/api/client'
import { dateInZone, readableDate } from '../src/features/booking/utils'
import { slotConflictMessage } from '../src/features/booking/attempt'
import type { BookingRequest } from '../src/features/booking/schemas'

const id = '11111111-1111-4111-8111-111111111111'
const timezone = 'America/Argentina/Buenos_Aires'
let client: QueryClient
afterEach(() => { cleanup(); client?.clear() })
it('recupera el wizard tras un 409, conserva el cliente y confirma otra hora con una clave nueva', async () => {
  const requests: InternalAxiosRequestConfig[] = []
  let conflict = false
  const date = format(addDays(parseISO(dateInZone(timezone)), 1), 'yyyy-MM-dd')
  api.defaults.adapter = async (config) => {
    let data: unknown
    if (config.url?.endsWith('/catalog')) {
      data = { tenant: { name: 'Barbería Central', slug: 'barberia' }, branches: [{ id, name: 'Centro', address: null, timezone }], services: [{ id, name: 'Corte', price: '100.00', duration_minutes: 30 }], professionals: [{ id, display_name: 'Ana', branchIds: [id], serviceIds: [id], bookingOptions: [{ branchId: id, serviceId: id }] }], schedulers: [{ id, name: 'Agenda', branch_id: id, requires_approval: false, hold_duration_minutes: 30, professionalIds: null }] }
    } else if (config.url?.endsWith('/availability')) {
      data = { branchId: id, serviceId: id, date: config.params.date, timezone, durationMinutes: 30, slotIntervalMinutes: 15, slots: (conflict ? ['16'] : ['15', '16']).map((hour) => ({ startAt: `${date}T${hour}:00:00.000Z`, endAt: `${date}T${hour}:30:00.000Z`, professionalId: id, professionalName: 'Ana' })) }
    } else if (config.url?.endsWith('/appointments')) {
      requests.push(config)
      if (!conflict) {
        conflict = true
        throw new AxiosError('Conflict', undefined, config, undefined, { config, status: 409, statusText: 'Conflict', headers: {}, data: { error: 'El horario seleccionado acaba de ser ocupado', code: '23P01' } })
      }
      const body: BookingRequest = JSON.parse(String(config.data))
      data = { appointment: { id, status: 'confirmed', holdExpiresAt: null, branchId: id, schedulerId: id, items: [{ id, serviceId: id, professionalId: id, startsAt: body.startsAt, endsAt: `${date}T16:30:00.000Z`, durationMinutes: 30, price: '100.00', serviceName: 'Corte' }] } }
    } else throw new Error('Unexpected request in wizard test')
    return { config, data, status: 200, statusText: 'OK', headers: {} }
  }
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/barberia/reservar']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path=":tenantSlug/reservar" element={<PublicBookingPage />} /></Routes></MemoryRouter></QueryClientProvider>)
  const user = userEvent.setup()
  await user.click(await screen.findByRole('radio', { name: /Centro/ }))
  await user.click(screen.getByRole('radio', { name: /Corte/ }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect((screen.getByRole('radio', { name: /Cualquiera disponible/ }) as HTMLInputElement).checked).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  if (!screen.queryByRole('button', { name: readableDate(date) })) await user.click(screen.getByRole('button', { name: 'Mes siguiente' }))
  await user.click(screen.getByRole('button', { name: readableDate(date) }))
  await user.click(await screen.findByRole('button', { name: '12:00' }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.type(screen.getByLabelText('Nombre y apellido'), 'Cliente Prueba')
  await user.type(screen.getByLabelText('Correo electrónico'), 'cliente@example.invalid')
  await user.click(screen.getByRole('button', { name: 'Reservar turno' }))
  expect(await screen.findByText(slotConflictMessage)).toBeTruthy()
  expect(screen.queryByRole('button', { name: '12:00' })).toBeNull()
  await user.click(await screen.findByRole('button', { name: '13:00' }))
  await waitFor(() => expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(false))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect((screen.getByLabelText('Nombre y apellido') as HTMLInputElement).value).toBe('Cliente Prueba')
  expect((screen.getByLabelText('Correo electrónico') as HTMLInputElement).value).toBe('cliente@example.invalid')
  await user.click(screen.getByRole('button', { name: 'Reservar turno' }))
  expect(await screen.findByRole('heading', { name: 'Tu turno está confirmado' })).toBeTruthy()
  expect(requests).toHaveLength(2)
  expect(requests[0].headers.get('Idempotency-Key')).not.toBe(requests[1].headers.get('Idempotency-Key'))
  expect(JSON.parse(String(requests[1].data)).items[0].professionalSelection).toEqual({ mode: 'any' })
})

it('no ofrece profesionales ni permite avanzar si no tienen horarios en la sucursal', async () => {
  api.defaults.adapter = async (config) => ({ config, status: 200, statusText: 'OK', headers: {}, data: {
    tenant: { name: 'Barbería Central', slug: 'barberia' },
    branches: [{ id, name: 'Centro', address: null, timezone }],
    services: [{ id, name: 'Corte', price: '100.00', duration_minutes: 30 }],
    professionals: [{ id, display_name: 'Ana', branchIds: [id], serviceIds: [id], bookingOptions: [] }],
    schedulers: [{ id, name: 'Agenda', branch_id: id, requires_approval: false, hold_duration_minutes: 30, professionalIds: null }],
  } })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/barberia/reservar']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path=":tenantSlug/reservar" element={<PublicBookingPage />} /></Routes></MemoryRouter></QueryClientProvider>)
  const user = userEvent.setup()
  await user.click(await screen.findByRole('radio', { name: /Centro/ }))
  await user.click(screen.getByRole('radio', { name: /Corte/ }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.queryByRole('radio', { name: /Ana/ })).toBeNull()
  expect(screen.queryByRole('radio', { name: /Cualquiera disponible/ })).toBeNull()
  expect(screen.getByText(/Todavía no hay profesionales con horarios compatibles/)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(true)
})
