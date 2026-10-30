// @vitest-environment jsdom
import { beforeAll, beforeEach, afterEach, it, expect, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import App from '../src/App'
import { ProfessionalsPage } from '../src/pages/CatalogPages'
import { api } from '../src/api/client'
import { useAuthStore } from '../src/stores/useAuthStore'

const id = '11111111-1111-4111-8111-111111111111', employee = '22222222-2222-4222-8222-222222222222'
const user = { id: employee, email: 'staff@example.invalid', fullName: 'Empleado QA' }
const tenant = { id, name: 'Empresa QA', slug: 'empresa-qa', timezone: 'America/Argentina/Buenos_Aires', status: 'active', slotIntervalMinutes: 15, role: 'OWNER' }
const challenge = { requiresPasswordChange: true as const, temporaryToken: 'temporary-token', user, expiresIn: 600 }
const writes: InternalAxiosRequestConfig[] = []
let client: QueryClient, expired: boolean, linked: boolean
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open') } })
})
beforeEach(() => {
  useAuthStore.getState().logout(); writes.length = 0; expired = false; linked = false
  window.history.replaceState({}, '', '/login')
  api.defaults.adapter = async (config) => {
    writes.push(config)
    let data: unknown
    if (config.url === '/auth/login') data = challenge
    else if (config.url === '/auth/force-password-change') {
      if (expired) throw new AxiosError('Unauthorized', undefined, config, undefined, { config, headers: {}, status: 401, statusText: 'Unauthorized', data: { error: 'Sesión vencida' } })
      data = { user, accessToken: 'definitive-token', requiresPasswordChange: false }
    } else if (config.url === '/tenants/me') data = { tenants: [] }
    else if (config.url === '/team') data = { members: [] }
    else if (config.url === '/professionals' && config.method === 'get') data = { professionals: linked ? [{ id: employee, display_name: 'Empleado QA', user_id: employee, is_active: true, access_role: 'STAFF', membership_status: 'active', access_email: user.email }] : [] }
    else if (config.url === '/professionals' && config.method === 'post') data = { professional: { id: employee, display_name: 'Empleado QA', user_id: employee, is_active: true } }
    else if (config.url?.endsWith('/reset-password')) data = { professionalId: employee, requiresPasswordChange: true }
    else throw new Error(`Unexpected ${config.url}`)
    return { config, data, status: 200, statusText: 'OK', headers: {} }
  }
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
})
afterEach(() => { cleanup(); client.clear(); useAuthStore.getState().logout() })
function renderApp() { render(<QueryClientProvider client={client}><App /></QueryClientProvider>); return userEvent.setup() }
function renderTeam(role = 'OWNER') {
  useAuthStore.setState({ accessToken: 'owner-token', tenantId: id, tenantRole: role as 'OWNER' | 'ADMIN', user: { ...user, id } })
  render(<QueryClientProvider client={client}><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route element={<Outlet context={{ ...tenant, role }} />}><Route index element={<ProfessionalsPage />} /></Route></Routes></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}
it('login temporal obliga a cambiar contraseña, bloquea dashboard y sólo instala la sesión definitiva al finalizar', async () => {
  const ui = renderApp()
  await ui.type(await screen.findByLabelText('Correo electrónico'), user.email)
  await ui.type(screen.getByLabelText('Contraseña'), '12345678')
  await ui.click(screen.getByRole('button', { name: /Ingresar/ }))
  await screen.findByRole('heading', { name: 'Elegí tu nueva contraseña' })
  expect(useAuthStore.getState().accessToken).toBeNull()
  expect(useAuthStore.getState().passwordChallenge?.temporaryToken).toBe('temporary-token')
  // A direct browser navigation cannot bypass the route guard.
  window.history.pushState({}, '', '/dashboard/finance')
  window.dispatchEvent(new PopStateEvent('popstate'))
  await waitFor(() => expect(window.location.pathname).toBe('/force-password-change'))
  expect(writes.some((request) => request.url === '/finance/summary' || request.url === '/tenants/me')).toBe(false)
  await ui.type(screen.getByLabelText('Nueva contraseña'), 'Segura-nueva-123')
  await ui.type(screen.getByLabelText('Repetir nueva contraseña'), 'Distinta')
  await ui.click(screen.getByRole('button', { name: 'Guardar contraseña e ingresar' }))
  await screen.findByText('Las contraseñas no coinciden')
  expect(writes.filter((r) => r.url === '/auth/force-password-change')).toHaveLength(0)
  await ui.clear(screen.getByLabelText('Repetir nueva contraseña'))
  await ui.type(screen.getByLabelText('Repetir nueva contraseña'), 'Segura-nueva-123')
  await ui.click(screen.getByRole('button', { name: 'Guardar contraseña e ingresar' }))
  await waitFor(() => expect(useAuthStore.getState().accessToken).toBe('definitive-token'))
  const request = writes.find((r) => r.url === '/auth/force-password-change')!
  expect(request.headers.get('Authorization')).toBe('Bearer temporary-token')
  expect(JSON.parse(request.data)).toEqual({ password: 'Segura-nueva-123' })
  expect(useAuthStore.getState().passwordChallenge).toBeNull()
  await screen.findByText('Creá tu primera empresa')
})
it('una sesión temporal vencida vuelve al login sin otorgar acceso', async () => {
  useAuthStore.getState().setPasswordChallenge(challenge); expired = true
  window.history.replaceState({}, '', '/force-password-change')
  const ui = renderApp()
  await ui.type(await screen.findByLabelText('Nueva contraseña'), 'Segura-nueva-123')
  await ui.type(screen.getByLabelText('Repetir nueva contraseña'), 'Segura-nueva-123')
  await ui.click(screen.getByRole('button', { name: 'Guardar contraseña e ingresar' }))
  await screen.findByText(/La sesión temporal venció o ya fue utilizada/)
  expect(useAuthStore.getState().accessToken).toBeNull()
  expect(useAuthStore.getState().passwordChallenge).toBeNull()
})
it('el desafío sobrevive una recarga en sessionStorage y se descarta al cerrar sesión', async () => {
  useAuthStore.getState().setPasswordChallenge(challenge)
  useAuthStore.setState({ passwordChallenge: null })
  await useAuthStore.persist.rehydrate()
  expect(useAuthStore.getState().passwordChallenge?.temporaryToken).toBe(challenge.temporaryToken)
  expect(useAuthStore.getState().accessToken).toBeNull()
  useAuthStore.getState().logout()
  await useAuthStore.persist.rehydrate()
  expect(useAuthStore.getState().passwordChallenge).toBeNull()
})
it('el alta por email valida y envía acceso junto al contrato sin contraseña en el payload', async () => {
  const ui = renderTeam()
  await ui.click(screen.getByRole('button', { name: 'Agregar al equipo' }))
  await ui.type(screen.getByLabelText('Nombre del profesional'), 'Empleado QA')
  await ui.type(screen.getByLabelText('Email de acceso (opcional)'), 'invalido')
  await ui.click(screen.getByRole('button', { name: 'Crear profesional y contrato' }))
  await screen.findByText('Ingresá un correo válido')
  expect(writes.filter((r) => r.method === 'post' && r.url === '/professionals')).toHaveLength(0)
  await ui.clear(screen.getByLabelText('Email de acceso (opcional)'))
  await ui.type(screen.getByLabelText('Email de acceso (opcional)'), user.email)
  await ui.click(screen.getByRole('button', { name: 'Crear profesional y contrato' }))
  await screen.findByText('El equipo se actualizó correctamente.')
  const payload = JSON.parse(writes.find((r) => r.method === 'post' && r.url === '/professionals')!.data)
  expect(payload.email).toBe(user.email); expect(payload).toHaveProperty('contract'); expect(payload).not.toHaveProperty('password')
})
it('OWNER restablece la contraseña vinculada con confirmación e idempotencia; ADMIN no tiene la acción', async () => {
  linked = true
  const ui = renderTeam()
  await ui.click(await screen.findByRole('button', { name: 'Restablecer contraseña de Empleado QA' }))
  expect(screen.getByRole('heading', { name: 'Restablecer contraseña del empleado' })).toBeTruthy()
  expect(writes.some((r) => r.url?.endsWith('/reset-password'))).toBe(false)
  await ui.click(screen.getByRole('button', { name: 'Restablecer contraseña', exact: true }))
  await screen.findByText('Contraseña temporal lista')
  const request = writes.find((r) => r.url?.endsWith('/reset-password'))!
  expect(request.headers.get('X-Tenant-Id')).toBe(id)
  expect(request.headers.get('Idempotency-Key')).toBeTruthy()
  cleanup(); client.clear(); renderTeam('ADMIN')
  await screen.findByText('Empleado QA')
  expect(screen.queryByRole('button', { name: 'Restablecer contraseña de Empleado QA' })).toBeNull()
})
