// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { BookingSettings } from '../src/features/schedulers/BookingSettings'
import { api } from '../src/api/client'
import { useAuthStore } from '../src/stores/useAuthStore'

const id = '11111111-1111-4111-8111-111111111111'
const tenant = { id, name: 'Empresa QA', slug: 'empresa-qa', status: 'active', timezone: 'America/Argentina/Buenos_Aires', slotIntervalMinutes: 15 }
let client: QueryClient
let enabled: boolean
let failing: boolean
let scheduler: { id: string; name: string; branch_id: string | null; requires_approval: boolean; hold_duration_minutes: number; is_active: boolean }
const writes: InternalAxiosRequestConfig[] = []
beforeEach(() => {
  enabled = false; failing = false; writes.length = 0
  scheduler = { id, name: 'Reservas online', branch_id: null, requires_approval: false, hold_duration_minutes: 30, is_active: true }
  useAuthStore.setState({ accessToken: 'test-session', tenantId: id, user: { id, fullName: 'Owner', email: 'owner@example.invalid' } })
  api.defaults.adapter = async (config) => {
    let data: unknown
    if (config.url === '/branches') data = { branches: [{ id, name: 'Centro', timezone: tenant.timezone, address: null, is_active: true }] }
    else if (config.method === 'get') data = { schedulers: enabled ? [scheduler] : [] }
    else {
      writes.push(config)
      if (failing) throw new AxiosError('Failure', undefined, config, undefined, { config, status: 403, statusText: 'Forbidden', headers: {}, data: { error: 'No tienes permisos para esta operación' } })
      const payload = JSON.parse(String(config.data))
      scheduler = { ...scheduler,
        ...('name' in payload ? { name: payload.name } : {}),
        ...('branchId' in payload ? { branch_id: payload.branchId } : {}),
        ...('requiresApproval' in payload ? { requires_approval: payload.requiresApproval } : {}),
        ...('holdDurationMinutes' in payload ? { hold_duration_minutes: payload.holdDurationMinutes } : {}),
        ...('isActive' in payload ? { is_active: payload.isActive } : {}),
      }
      enabled = true; data = { scheduler }
    }
    return { config, data, status: 200, statusText: 'OK', headers: {} }
  }
})
afterEach(() => { cleanup(); client?.clear(); useAuthStore.getState().logout() })
function setup(role = 'OWNER') {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidation = vi.spyOn(client, 'invalidateQueries')
  render(<QueryClientProvider client={client}><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route element={<Outlet context={{ ...tenant, role }} />}><Route index element={<BookingSettings />} /></Route></Routes></MemoryRouter></QueryClientProvider>)
  return { invalidation, user: userEvent.setup() }
}
it('detecta la agenda faltante y permite habilitarla con el tenant correcto', async () => {
  const { invalidation, user } = setup()
  expect(await screen.findByText(/No tenés ninguna agenda activa/)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Habilitar agenda de reservas' }))
  await screen.findByText('Agenda habilitada. Ya podés abrir tu página pública y consultar los horarios.')
  expect(writes).toHaveLength(1)
  expect(JSON.parse(String(writes[0].data))).toEqual({ name: 'Reservas online', branchId: null, requiresApproval: false, holdDurationMinutes: 30, isActive: true })
  expect(writes[0].headers.get('X-Tenant-Id')).toBe(id)
  expect(invalidation).toHaveBeenCalledWith({ queryKey: ['public-catalog', tenant.slug] })
  expect(screen.queryByText(/No tenés ninguna agenda activa/)).toBeNull()
})
it('permite elegir aprobación manual y mantiene los errores de la API visibles', async () => {
  failing = true
  const { user } = setup()
  await screen.findByLabelText('Nombre de la agenda')
  await user.click(screen.getByLabelText('Quiero aprobar los turnos antes de confirmarlos'))
  expect(screen.getByLabelText('Plazo para aprobar (minutos)')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Habilitar agenda de reservas' }))
  expect(await screen.findByText('No tienes permisos para esta operación')).toBeTruthy()
  expect(JSON.parse(String(writes[0].data)).requiresApproval).toBe(true)
  expect(screen.getByLabelText('Nombre de la agenda')).toBeTruthy()
})
it('un usuario STAFF recibe la indicación sin controles de escritura', async () => {
  setup('STAFF')
  await waitFor(() => expect(screen.getByText('Un propietario o administrador debe habilitar las agendas de reservas.')).toBeTruthy())
  expect(screen.queryByRole('button', { name: 'Habilitar agenda de reservas' })).toBeNull()
  expect(writes).toHaveLength(0)
})

it('edita una agenda existente mediante PATCH sin crear otra', async () => {
  enabled = true
  const { user, invalidation } = setup()
  await user.click(await screen.findByRole('button', { name: 'Editar' }))
  expect((screen.getByLabelText('Nombre de la agenda') as HTMLInputElement).value).toBe('Reservas online')
  await user.clear(screen.getByLabelText('Nombre de la agenda'))
  await user.type(screen.getByLabelText('Nombre de la agenda'), 'Turnos Centro')
  await user.selectOptions(screen.getByLabelText('Sucursales habilitadas'), id)
  await user.click(screen.getByLabelText('Quiero aprobar los turnos antes de confirmarlos'))
  await user.clear(screen.getByLabelText('Plazo para aprobar (minutos)'))
  await user.type(screen.getByLabelText('Plazo para aprobar (minutos)'), '60')
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await screen.findByText('Agenda actualizada.')
  expect(writes).toHaveLength(1)
  expect(writes[0].method).toBe('patch')
  expect(writes[0].url).toBe(`/schedulers/${id}`)
  expect(JSON.parse(String(writes[0].data))).toEqual({ name: 'Turnos Centro', branchId: id, requiresApproval: true, holdDurationMinutes: 60 })
  expect(writes[0].headers.get('X-Tenant-Id')).toBe(id)
  expect(invalidation).toHaveBeenCalledWith({ queryKey: ['schedulers', id] })
})
it('desactiva con confirmación y permite reactivar sin borrar turnos', async () => {
  enabled = true
  const { user } = setup()
  await user.click(await screen.findByRole('button', { name: 'Desactivar' }))
  expect(writes).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Volver' }))
  expect(writes).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Desactivar' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar desactivación' }))
  await screen.findByText('Agenda desactivada. Los turnos existentes se conservan.')
  expect(JSON.parse(String(writes[0].data))).toEqual({ isActive: false })
  await user.click(screen.getByRole('button', { name: 'Reactivar' }))
  await screen.findByText('Agenda reactivada. Volvé a consultar la página pública.')
  expect(JSON.parse(String(writes[1].data))).toEqual({ isActive: true })
  expect(screen.queryByText(/No tenés ninguna agenda activa/)).toBeNull()
})
it('mantiene los datos editados y muestra el error si el PATCH falla', async () => {
  enabled = true; failing = true
  const { user } = setup()
  await user.click(await screen.findByRole('button', { name: 'Editar' }))
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  expect(await screen.findByText('No tienes permisos para esta operación')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeTruthy()
})
