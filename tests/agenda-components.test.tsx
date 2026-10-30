// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import AgendaPage from '../src/pages/AgendaPage'
import { api } from '../src/api/client'
import { useAuthStore } from '../src/stores/useAuthStore'
import type { AgendaAppointment, AppointmentStatus } from '../src/features/agenda/schemas'

const id = '11111111-1111-4111-8111-111111111111'
const otherProfessional = '22222222-2222-4222-8222-222222222222'
const tenant = { id, name: 'Barbería QA', slug: 'barberia-qa', status: 'active', timezone: 'America/Argentina/Buenos_Aires', slotIntervalMinutes: 15, role: 'ADMIN' }
let client: QueryClient
let paymentStatus: AgendaAppointment['paymentStatus']
let status: AppointmentStatus
let listCount: number
let conflict: boolean
const reads: string[] = []
const actions: string[] = []
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open') } })
})
beforeEach(() => {
  paymentStatus = 'pending'; status = 'pending'; listCount = 0; conflict = false; actions.length = 0; reads.length = 0
  useAuthStore.setState({ accessToken: 'test-session', tenantId: id, tenantRole: 'ADMIN', user: { id, fullName: 'Staff', email: 'staff@example.invalid' } })
  api.defaults.adapter = async (config) => {
    reads.push(config.url ?? '')
    let data: unknown
    if (config.url === '/appointments/my-context') data = { professionals: [{ id, name: 'Ana' }], branches: [{ id, name: 'Centro', timezone: tenant.timezone }] }
    else if (config.url === '/branches') data = { branches: [{ id, name: 'Centro', address: null, timezone: tenant.timezone, is_active: true }] }
    else if (config.url === '/professionals') data = { professionals: [{ id, display_name: 'Ana', user_id: null, is_active: true }, { id: otherProfessional, display_name: 'Luis', user_id: null, is_active: true }] }
    else if (config.url?.endsWith('/assignments')) data = { assignments: { branchIds: config.url.includes(otherProfessional) ? [] : [id], serviceIds: [id], workingHours: [] } }
    else if (config.method === 'get' && config.url === '/appointments') {
      listCount++
      const date = config.params.startDate
      const row: AgendaAppointment = { id, status, paymentStatus, observations: null, holdExpiresAt: status === 'pending' ? new Date(Date.now() + 3600_000).toISOString() : null, startsAt: `${date}T12:00:00Z`, endsAt: `${date}T12:30:00Z`, branch: { id, name: 'Centro', timezone: tenant.timezone }, customer: { displayName: 'Cliente QA', email: 'cliente@example.invalid', phone: null }, items: [{ id, serviceId: id, serviceName: 'Corte', professionalId: id, professionalName: 'Ana', startsAt: `${date}T12:00:00Z`, endsAt: `${date}T12:30:00Z`, durationMinutes: 30, price: '100.00' }] }
      data = { appointments: [row], pagination: { total: 1, offset: 0, limit: 100 } }
    } else if (config.url?.endsWith('/confirm') || config.url?.endsWith('/cancel')) {
      actions.push(config.url)
      if (conflict) {
        status = 'expired'
        throw new AxiosError('Conflict', undefined, config, undefined, { config, data: { error: 'La reserva pendiente venció antes de poder confirmarse' }, status: 409, statusText: 'Conflict', headers: {} })
      }
      status = config.url.endsWith('/confirm') ? 'confirmed' : 'cancelled'
      data = { appointmentId: id, status }
    } else throw new Error('Unexpected request')
    return { config, data, status: 200, statusText: 'OK', headers: {} }
  }
})
afterEach(() => { cleanup(); client?.clear(); useAuthStore.getState().logout() })
function setup() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/dashboard/agenda']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route element={<Outlet context={tenant} />}><Route path="/dashboard/agenda" element={<AgendaPage />} /></Route></Routes></MemoryRouter></QueryClientProvider>)
  return { user: userEvent.setup(), invalidate }
}
it('confirma y cancela, invalida agenda y disponibilidad y refleja ambos cambios sin recargar', async () => {
  const { user, invalidate } = setup()
  await user.click(await screen.findByRole('button', { name: /Ver turno de Cliente QA/ }))
  expect(screen.getByRole('heading', { name: 'Detalle del turno' })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Confirmar turno de Cliente QA' }))
  expect(screen.getByRole('heading', { name: 'Confirmar reserva' })).toBeTruthy()
  await user.dblClick(screen.getByRole('button', { name: 'Confirmar turno', exact: true }))
  await screen.findByText('Turno confirmado. La agenda está actualizada.')
  await user.click(await screen.findByRole('button', { name: /Ver turno de Cliente QA.*Confirmado/ }))
  const article = screen.getByRole('article', { name: 'Turno de Cliente QA' })
  expect(within(article).getByText('Confirmado')).toBeTruthy()
  expect(within(article).queryByRole('button', { name: /Confirmar/ })).toBeNull()
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['agenda', id] })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['public-availability', tenant.slug] })
  await user.click(screen.getByRole('button', { name: 'Cancelar turno de Cliente QA' }))
  await user.click(screen.getByRole('button', { name: 'Cancelar turno', exact: true }))
  await screen.findByText('Turno cancelado. El horario quedó liberado.')
  expect(await screen.findByRole('button', { name: /Ver turno de Cliente QA.*Cancelado/ })).toBeTruthy()
  expect(actions).toEqual([`/appointments/${id}/confirm`, `/appointments/${id}/cancel`])
  expect(listCount).toBeGreaterThanOrEqual(3)
})
it('un conflicto actualiza el estado vencido y retira las acciones que ya no corresponden', async () => {
  conflict = true
  const { user } = setup()
  await user.click(await screen.findByRole('button', { name: /Ver turno de Cliente QA/ }))
  expect(screen.getByRole('heading', { name: 'Detalle del turno' })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Confirmar turno de Cliente QA' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar turno', exact: true }))
  expect(await screen.findByText('La reserva pendiente venció antes de poder confirmarse')).toBeTruthy()
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Confirmar turno de Cliente QA' })).toBeNull())
  expect(await screen.findByRole('button', { name: /Ver turno de Cliente QA.*Vencido/ })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Confirmar reserva' })).toBeNull()
})
it('permite pasar a semana y filtrar por sucursal', async () => {
  const { user } = setup()
  await screen.findByRole('button', { name: /Ver turno de Cliente QA/ })
  await user.click(screen.getByRole('button', { name: 'Semana', exact: true }))
  await waitFor(() => expect(within(screen.getByRole('region', { name: 'Calendario con desplazamiento horizontal y vertical' })).getAllByRole('heading', { level: 3 })).toHaveLength(7))
  await user.selectOptions(screen.getByLabelText('Sucursal'), id)
  await waitFor(() => expect(listCount).toBeGreaterThanOrEqual(3))
  expect(screen.getByRole('button', { name: 'Semana siguiente' })).toBeTruthy()
})

it('la vista diaria muestra profesionales sin turnos y permite filtrar una sola columna', async () => {
  const { user } = setup()
  await screen.findByRole('button', { name: /Ver turno de Cliente QA/ })
  expect(screen.getByRole('group', { name: 'Agenda de Ana' })).toBeTruthy()
  expect(screen.getByRole('group', { name: 'Agenda de Luis' })).toBeTruthy()
  await user.selectOptions(screen.getByLabelText('Profesional'), otherProfessional)
  expect(screen.queryByRole('group', { name: 'Agenda de Ana' })).toBeNull()
  expect(screen.getByRole('group', { name: 'Agenda de Luis' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Ver turno de Cliente QA/ })).toBeNull()
})
it('las columnas diarias se limitan a profesionales asignados a la sucursal', async () => {
  const { user } = setup()
  await screen.findByRole('button', { name: /Ver turno de Cliente QA/ })
  await user.selectOptions(screen.getByLabelText('Sucursal'), id)
  await waitFor(() => expect(screen.queryByRole('group', { name: 'Agenda de Luis' })).toBeNull())
  expect(screen.getByRole('group', { name: 'Agenda de Ana' })).toBeTruthy()
})

it('OWNER puede cobrar un completado impago desde el detalle de Agenda', async () => {
  status = 'completed'
  useAuthStore.setState({ tenantRole: 'OWNER' })
  const { user } = setup()
  expect(screen.getByRole('button', { name: 'Nuevo Turno Directo (Walk-in)' })).toBeTruthy()
  await user.click(await screen.findByRole('button', { name: /Ver turno de Cliente QA/ }))
  await user.click(screen.getByRole('button', { name: 'Cobrar', exact: true }))
  expect(screen.getByRole('heading', { name: 'Cobrar turno' })).toBeTruthy()
  expect(screen.getByLabelText('Medio de pago')).toBeTruthy()
})
it('un turno pagado no ofrece Cobrar aunque OWNER abra su detalle', async () => {
  status = 'completed'; paymentStatus = 'paid'
  useAuthStore.setState({ tenantRole: 'OWNER' })
  const { user } = setup()
  await user.click(await screen.findByRole('button', { name: /Ver turno de Cliente QA/ }))
  expect(screen.getByText('Pagado')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Cobrar', exact: true })).toBeNull()
})
it('STAFF no obtiene los controles financieros de la Agenda', async () => {
  useAuthStore.setState({ tenantRole: 'STAFF' })
  const { user } = setup()
  expect(screen.queryByRole('button', { name: 'Nuevo Turno Directo (Walk-in)' })).toBeNull()
  await user.click(await screen.findByRole('button', { name: /Ver turno de Cliente QA/ }))
  expect(screen.queryByRole('button', { name: 'Cobrar', exact: true })).toBeNull()
})

it('STAFF consulta sólo su contexto y no muestra acciones ni reutiliza la caché de OWNER', async () => {
  useAuthStore.setState({ tenantRole: 'STAFF' })
  const { user } = setup()
  await user.click(await screen.findByRole('button', { name: /Ver turno de Cliente QA/ }))
  expect(screen.queryByRole('button', { name: /Confirmar turno/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /Cancelar turno/ })).toBeNull()
  expect(screen.queryByLabelText('Profesional')).toBeNull()
  expect(reads.some((url) => ['/branches','/professionals'].includes(url) || url.endsWith('/assignments'))).toBe(false)
  expect(reads).toContain('/appointments/my-context')
  const keys = client.getQueryCache().getAll().filter((query) => query.queryKey[0] === 'agenda').map((query) => query.queryKey)
  expect(keys[0]?.slice(0, 4)).toEqual(['agenda', id, 'STAFF', id])
})
