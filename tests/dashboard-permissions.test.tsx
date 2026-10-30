// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from '../src/layouts/DashboardLayout'
import { useAuthStore } from '../src/stores/useAuthStore'
import { api } from '../src/api/client'

const id = '11111111-1111-4111-8111-111111111111'
let client: QueryClient
let forbiddenMounted = false
function Forbidden() { forbiddenMounted = true; return <p>Catálogo privado</p> }
afterEach(() => { cleanup(); client.clear(); useAuthStore.getState().logout() })
it.each([['STAFF', 'settings'], ['STAFF', 'branches'], ['STAFF', 'services'], ['STAFF', 'professionals'], ['ADMIN', 'settings'], ['ADMIN', 'statistics'], ['STAFF', 'statistics'], ['STAFF', 'finance/statistics'], ['ADMIN', 'finance/statistics']] as const)('%s no puede montar %s por URL', async (role, path) => {
  forbiddenMounted = false
  useAuthStore.setState({ accessToken: 'test', tenantId: id, tenantRole: null, user: { id, email: 'staff@example.invalid', fullName: 'Empleado' } })
  api.defaults.adapter = async (config) => {
    if (config.url !== '/tenants/me') throw new Error('Unexpected request')
    return { config, data: { tenants: [{ id, name: 'Empresa', slug: 'empresa', status: 'active', timezone: 'UTC', slotIntervalMinutes: 15, role }] }, status: 200, statusText: 'OK', headers: {} }
  }
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/dashboard/${path}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/dashboard" element={<DashboardLayout />}><Route path={path} element={<Forbidden />} /><Route path="agenda" element={<h1>Mi agenda privada</h1>} /></Route></Routes></MemoryRouter></QueryClientProvider>)
  await screen.findByRole('heading', { name: 'Mi agenda privada' })
  expect(forbiddenMounted).toBe(false)
  expect(screen.getByRole('link', { name: 'Agenda', exact: true })).toBeTruthy()
  if (role === 'STAFF') expect(screen.getByRole('link', { name: 'Finanzas', exact: true })).toBeTruthy()
  else for (const label of ['Sucursales', 'Servicios', 'Profesionales']) expect(screen.getByRole('link', { name: label, exact: true })).toBeTruthy()
  for (const label of role === 'STAFF' ? ['Mi empresa', 'Sucursales', 'Servicios', 'Profesionales', 'Estadísticas'] : ['Mi empresa', 'Finanzas', 'Estadísticas']) expect(screen.queryByRole('link', { name: label, exact: true })).toBeNull()
})
