// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, Navigate } from 'react-router-dom'
import { DashboardLayout } from '../src/layouts/DashboardLayout'
import { FinanceNavigation } from '../src/features/finance/FinanceNavigation'
import { api } from '../src/api/client'
import { useAuthStore } from '../src/stores/useAuthStore'
const id = '11111111-1111-4111-8111-111111111111'
let client: QueryClient
afterEach(() => { cleanup(); client?.clear(); useAuthStore.getState().logout() })
function setup(path = '/dashboard/finance') {
  useAuthStore.setState({ accessToken: 'test', tenantId: id, tenantRole: null, user: { id, fullName: 'Owner', email: 'owner@example.invalid' } })
  api.defaults.adapter = async (config) => {
    if (config.url !== '/tenants/me') throw new Error('Unexpected request')
    return { config, status: 200, statusText: 'OK', headers: {}, data: { tenants: [{ id, name: 'Empresa', slug: 'empresa', status: 'active', timezone: 'UTC', slotIntervalMinutes: 15, role: 'OWNER' }] } }
  }
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]} future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Routes><Route path="dashboard" element={<DashboardLayout />}><Route path="finance" element={<><FinanceNavigation /><h1>Gestión del local</h1></>} /><Route path="finance/statistics" element={<><FinanceNavigation /><h1>Informe estadístico</h1></>} /><Route path="statistics" element={<Navigate to="/dashboard/finance/statistics" replace />} /></Route></Routes></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}
it('OWNER abre Estadísticas dentro de Finanzas y Finanzas sigue resaltado en la navegación principal', async () => {
  const user = setup()
  await screen.findByRole('heading', { name: 'Gestión del local' })
  expect(screen.getByRole('link', { name: 'Gestión financiera' }).getAttribute('aria-current')).toBe('page')
  const statistics = screen.getByRole('link', { name: 'Estadísticas' })
  expect(statistics.getAttribute('href')).toBe('/dashboard/finance/statistics')
  await user.click(statistics)
  await screen.findByRole('heading', { name: 'Informe estadístico' })
  expect(screen.getByRole('link', { name: 'Finanzas', exact: true }).getAttribute('aria-current')).toBe('page')
  expect(screen.getByRole('link', { name: 'Estadísticas' }).getAttribute('aria-current')).toBe('page')
  expect(screen.getByRole('link', { name: 'Gestión financiera' }).getAttribute('aria-current')).toBeNull()
  await user.click(screen.getByRole('link', { name: 'Gestión financiera' }))
  await screen.findByRole('heading', { name: 'Gestión del local' })
})
it('el enlace anterior redirige a Estadísticas dentro de Finanzas', async () => {
  setup('/dashboard/statistics')
  await screen.findByRole('heading', { name: 'Informe estadístico' })
  await waitFor(() => expect(screen.getByRole('link', { name: 'Finanzas', exact: true }).getAttribute('aria-current')).toBe('page'))
})
it.each(['ADMIN', 'STAFF'] as const)('%s no recibe las secciones financieras de OWNER', (role) => {
  useAuthStore.setState({ tenantRole: role })
  render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><FinanceNavigation /></MemoryRouter>)
  expect(screen.queryByRole('navigation', { name: 'Secciones de Finanzas' })).toBeNull()
})
