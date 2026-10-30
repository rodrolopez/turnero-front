// @vitest-environment jsdom
import { beforeAll, beforeEach, afterEach, it, expect, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { validate, version } from 'uuid'
import { ProfessionalsPage } from '../src/pages/CatalogPages'
import { DashboardLayout } from '../src/layouts/DashboardLayout'
import FinancePage from '../src/pages/FinancePage'
import { CheckoutModal } from '../src/features/finance/CheckoutModal'
import { WalkInModal } from '../src/features/finance/WalkInModal'
import { ProfessionalContractSection } from '../src/features/finance/ProfessionalContractSection'
import { api } from '../src/api/client'
import { useAuthStore } from '../src/stores/useAuthStore'
import type { Tenant } from '../src/lib/schemas'
import type { AgendaAppointment } from '../src/features/agenda/schemas'

const id = '11111111-1111-4111-8111-111111111111'
const txId = '22222222-2222-4222-8222-222222222222'
const other = '33333333-3333-4333-8333-333333333333'
const tenant: Tenant = { id, name: 'Empresa QA', slug: 'empresa-qa', status: 'active', timezone: 'America/Argentina/Buenos_Aires', slotIntervalMinutes: 15, role: 'OWNER' }
const professional = { id, display_name: 'Ana', user_id: id, is_active: true }
const receipt = { appointmentId: id, status: 'completed', paymentStatus: 'paid', totalAmount: '100.00', transactionIds: [txId] }
const appointment: AgendaAppointment = { id, status: 'completed', paymentStatus: 'pending', observations: 'Nota inicial', holdExpiresAt: null, startsAt: '2030-01-01T12:00:00Z', endsAt: '2030-01-01T12:30:00Z', branch: { id, name: 'Centro', timezone: tenant.timezone }, customer: { displayName: 'Cliente', email: 'cliente@example.invalid', phone: null }, items: [{ id, serviceId: id, professionalId: id, serviceName: 'Corte', professionalName: 'Ana', startsAt: '2030-01-01T12:00:00Z', endsAt: '2030-01-01T12:30:00Z', durationMinutes: 30, price: '100.00' }] }
let client: QueryClient
const requests: InternalAxiosRequestConfig[] = []
let balance: string, failFirst: boolean, transactionStatus: string
let noProfile: boolean, foreignMovement: boolean
let createdProfessional: boolean, contractMissing: boolean, failContract: boolean
let contract = { id, professional_id: id, contract_type: 'percentage', value: '35.00', billing_cycle: null as string | null, start_date: '2020-01-01', is_active: true }
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open') } })
})
beforeEach(() => {
  createdProfessional = false; contractMissing = false; failContract = false; noProfile = false; foreignMovement = false; requests.length = 0; balance = '35.00'; failFirst = false; transactionStatus = 'completed'
  contract = { id, professional_id: id, contract_type: 'percentage', value: '35.00', billing_cycle: null, start_date: '2020-01-01', is_active: true }
  useAuthStore.setState({ accessToken: 'test-session', tenantId: id, tenantRole: 'OWNER', user: { id, fullName: 'Propietario', email: 'qa@example.invalid' } })
  api.defaults.adapter = async (config) => {
    requests.push(config)
    let data: unknown
    if (config.method !== 'get' && failFirst) { failFirst = false; throw new AxiosError('Network Error', undefined, config) }
    if (config.url === '/professionals' && config.method === 'get') data = { professionals: createdProfessional ? [professional] : [] }
    else if (config.url === '/professionals' && config.method === 'post') {
      if (failContract) throw new AxiosError('Failure', undefined, config, undefined, { config, status: 400, statusText: 'Bad Request', headers: {}, data: { error: 'No se pudo guardar el contrato' } })
      createdProfessional = true; contractMissing = false; data = { professional }
    }
    else if (config.url === `/professionals/${id}` && config.method === 'patch') data = { professional: { ...professional, display_name: JSON.parse(config.data).displayName } }
    else if (config.url === '/team' && config.method === 'get') data = { members: [{ id, user_id: id, role: 'OWNER', status: 'active', full_name: 'Propietario QA', email: 'qa@example.invalid', has_professional: false }] }
    else if (config.url === '/team/admins') data = { member: { id: txId, user_id: other, role: 'ADMIN', status: 'active' } }
    else if (config.url === '/finance/contracts' && config.method === 'post') {
      if (failContract) throw new AxiosError('Failure', undefined, config, undefined, { config, status: 400, statusText: 'Bad Request', headers: {}, data: { error: 'No se pudo guardar el contrato' } })
      const input = JSON.parse(config.data); contractMissing = false
      contract = { ...contract, professional_id: input.professionalId, contract_type: input.contractType, value: input.value, billing_cycle: input.billingCycle, start_date: input.startDate, is_active: input.isActive }
      data = { contract }
    }
    else if (config.url === '/tenants/me') data = { tenants: [tenant] }
    else if (config.url === '/finance/summary') data = { totalAmount: '100.00', businessEarnings: '65.00', professionalEarnings: '35.00' }
    else if (config.url === '/finance/settlements/balances') data = { balances: noProfile ? [] : [{ professionalId: id, name: 'Ana', balance }] }
    else if (config.url === '/finance/transactions') data = { entries: [{ id: txId, professional_id: foreignMovement ? other : id, appointment_id: id, total_amount: '100.00', business_earnings: '65.00', professional_earnings: '35.00', amount: '35.00', status: transactionStatus, payment_method: 'mercado_pago', created_at: '2030-01-01T12:00:00Z' }], pagination: { total: 1, offset: config.params?.offset ?? 0, limit: 50 } }
    else if (config.url === '/finance/settlements/payout') { balance = '0.00'; data = { settlement: { id: txId, professional_id: id, amount: JSON.parse(config.data).direction === 'from_professional' ? '35.00' : '-35.00', type: 'payout' } } }
    else if (config.url?.endsWith('/void')) { transactionStatus = 'voided'; data = { transactionId: txId, status: 'voided', reversedTransactionIds: [txId], externalRefundRequired: true } }
    else if (config.url?.startsWith('/finance/checkout/') || config.url === '/appointments/walk-in') data = receipt
    else if (config.url?.endsWith('/catalog')) data = { tenant: { name: tenant.name, slug: tenant.slug }, branches: [{ id, name: 'Centro', address: null, timezone: tenant.timezone }], services: [{ id, name: 'Corte', duration_minutes: 30, price: '100.00' }], professionals: [{ id, display_name: 'Ana', branchIds: [id], serviceIds: [id], bookingOptions: [] }], schedulers: [{ id, name: 'Agenda', branch_id: id, professionalIds: null, requires_approval: false, hold_duration_minutes: 30 }] }
    else if (config.url === '/finance/contracts' && config.method === 'get') data = { contracts: contractMissing ? [] : [contract] }
    else if (config.url === `/finance/contracts/${id}` && config.method === 'put') {
      const input = JSON.parse(config.data); contract = { ...contract, contract_type: input.contractType, value: input.value, billing_cycle: input.billingCycle, is_active: input.isActive }; data = { contract }
    } else if (config.url === `/finance/contracts/${id}` && config.method === 'delete') { contract.is_active = false; data = { contract } }
    else throw new Error(`Unexpected request: ${config.method} ${config.url}`)
    return { config, data, status: 200, statusText: 'OK', headers: {} }
  }
})
afterEach(() => { cleanup(); client?.clear(); useAuthStore.getState().logout() })
function setup(element = <FinancePage />, role: Tenant['role'] = 'OWNER') {
  useAuthStore.setState({ tenantRole: role })
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(<QueryClientProvider client={client}><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route element={<Outlet context={{ ...tenant, role }} />}><Route index element={element} /></Route></Routes></MemoryRouter></QueryClientProvider>)
  return { user: userEvent.setup(), invalidate }
}
it('STAFF consulta su propio ID y oculta resumen, bruto y controles de OWNER', async () => {
  setup(<FinancePage />, 'STAFF')
  await screen.findByRole('heading', { name: 'Mi historial de transacciones' })
  await waitFor(() => expect(requests.some((r) => r.url === '/finance/transactions')).toBe(true))
  expect(requests.find((r) => r.url === '/finance/transactions')?.params.professionalId).toBe(id)
  expect(requests.every((r) => r.url !== '/finance/summary' && !r.url?.includes('/contracts'))).toBe(true)
  expect(screen.queryByText('Bruto total')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Anular' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Registrar Pago' })).toBeNull()
})
it('ADMIN no consulta endpoints financieros globales ni contratos', () => {
  setup(<><FinancePage /><ProfessionalContractSection professional={professional} /></>, 'ADMIN')
  expect(screen.getByText(/Tu rol no tiene acceso/)).toBeTruthy()
  expect(requests).toHaveLength(0)
})
it('OWNER liquida saldo con UUID y conserva la misma operación ante fallo de red', async () => {
  const { user, invalidate } = setup()
  await user.click(await screen.findByRole('button', { name: 'Registrar Pago' }))
  failFirst = true
  await user.dblClick(screen.getByRole('button', { name: 'Confirmar pago' }))
  await screen.findByRole('button', { name: 'Verificar operación' })
  expect((screen.getByRole('button', { name: 'Cerrar ventana' }) as HTMLButtonElement).disabled).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Verificar operación' }))
  await screen.findByText('Pago registrado. Las cuentas corrientes están actualizadas.')
  const writes = requests.filter((r) => r.url === '/finance/settlements/payout')
  expect(writes).toHaveLength(2)
  const key = String(writes[0].headers.get('Idempotency-Key'))
  expect(validate(key)).toBe(true); expect(version(key)).toBe(4)
  expect(writes[1].headers.get('Idempotency-Key')).toBe(key)
  expect(writes[0].data).toBe(writes[1].data)
  expect(writes[0].headers.get('X-Tenant-Id')).toBe(id)
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['finance', id] })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['agenda', id] })
})
it('saldo negativo registra un cobro recibido, y void advierte sobre el reembolso externo', async () => {
  balance = '-35.00'
  const { user } = setup()
  await user.click(await screen.findByRole('button', { name: 'Registrar cobro de deuda' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar cobro de deuda' }))
  await screen.findByText('Pago registrado. Las cuentas corrientes están actualizadas.')
  expect(JSON.parse(requests.find((r) => r.url === '/finance/settlements/payout')!.data).direction).toBe('from_professional')
  await user.click(screen.getByRole('button', { name: 'Anular', exact: true }))
  await user.type(screen.getByLabelText('Motivo de la anulación'), 'Error de caja')
  await user.click(screen.getByRole('button', { name: 'Confirmar anulación' }))
  await screen.findByText('Anulación contable registrada. Falta gestionar el reembolso en Mercado Pago.')
  expect(JSON.parse(requests.find((r) => r.url?.endsWith('/void'))!.data)).toEqual({ reason: 'Error de caja' })
})
it('Checkout envía efectivo y observaciones sin información financiera privada', async () => {
  const onSaved = vi.fn()
  const { user } = setup(<CheckoutModal appointment={appointment} onClose={vi.fn()} onSaved={onSaved} />, 'ADMIN')
  expect((screen.getByLabelText('Observaciones') as HTMLTextAreaElement).value).toBe('Nota inicial')
  await user.click(screen.getByRole('button', { name: 'Confirmar cobro' }))
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(receipt))
  const write = requests.find((r) => r.url?.includes('/checkout/'))!
  expect(JSON.parse(write.data)).toEqual({ paymentMethod: 'cash', observations: 'Nota inicial' })
  expect(write.headers.get('X-Tenant-Id')).toBe(id)
})
it('Walk-in valida la combinación y conserva el UUID al verificar un envío incierto', async () => {
  const onSaved = vi.fn()
  const { user } = setup(<WalkInModal initialBranch={id} onClose={vi.fn()} onSaved={onSaved} />, 'ADMIN')
  await screen.findByLabelText('Servicio')
  await user.selectOptions(screen.getByLabelText('Servicio'), id)
  await user.selectOptions(screen.getByLabelText('Profesional'), id)
  await user.type(screen.getByLabelText('Nombre y apellido del cliente'), 'Cliente QA')
  await user.type(screen.getByLabelText('Correo del cliente'), 'cliente@example.invalid')
  failFirst = true
  await user.dblClick(screen.getByRole('button', { name: 'Registrar y cobrar efectivo' }))
  await screen.findByRole('button', { name: 'Verificar operación' })
  await user.click(screen.getByRole('button', { name: 'Verificar operación' }))
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(receipt))
  const writes = requests.filter((r) => r.url === '/appointments/walk-in')
  expect(writes).toHaveLength(2)
  expect(validate(String(writes[0].headers.get('Idempotency-Key')))).toBe(true)
  expect(writes[1].headers.get('Idempotency-Key')).toBe(writes[0].headers.get('Idempotency-Key'))
  expect(JSON.parse(writes[0].data)).toMatchObject({ branchId: id, schedulerId: id, professionalId: id, serviceId: id, paymentMethod: 'cash', customer: { displayName: 'Cliente QA', email: 'cliente@example.invalid', phone: null } })
})
it('OWNER actualiza y desactiva el contrato existente sin duplicar registros', async () => {
  const { user } = setup(<ProfessionalContractSection professional={professional} />)
  await user.click(await screen.findByRole('button', { name: 'Editar contrato' }))
  await user.selectOptions(screen.getByLabelText('Modelo de trabajo'), 'salary')
  await user.click(screen.getByRole('button', { name: 'Guardar contrato' }))
  await screen.findByText('Contrato guardado.')
  const write = requests.find((r) => r.method === 'put')!
  expect(write.url).toBe(`/finance/contracts/${id}`)
  expect(JSON.parse(write.data)).toMatchObject({ contractType: 'salary', professionalId: id, value: '35.00', billingCycle: null })
  expect(requests.filter((r) => r.method === 'post')).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Desactivar contrato' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar baja del contrato' }))
  await screen.findByText('Contrato desactivado.')
})
it('al cambiar de empresa se descarta el rol y no se acepta un rol de otro tenant', () => {
  useAuthStore.getState().setTenant(other)
  expect(useAuthStore.getState().tenantRole).toBeNull()
  useAuthStore.getState().setTenantRole(id, 'OWNER')
  expect(useAuthStore.getState().tenantRole).toBeNull()
})

it('STAFF sin perfil vinculado no realiza consultas sin filtro de movimientos', async () => {
  noProfile = true
  setup(<FinancePage />, 'STAFF')
  await screen.findByText(/Todavía no tenés un profesional vinculado/)
  expect(requests.some((r) => r.url === '/finance/transactions')).toBe(false)
})
it('rechaza una respuesta inesperada que incluya movimientos de otro profesional', async () => {
  foreignMovement = true
  setup(<FinancePage />, 'STAFF')
  await screen.findByText('La respuesta del servidor no es válida. Intentá nuevamente.')
  expect(screen.queryByRole('cell', { name: '$ 35,00' })).toBeNull()
})
it('el layout verifica la membresía y sincroniza el rol en Zustand antes de mostrar Finanzas', async () => {
  useAuthStore.setState({ tenantRole: null })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/dashboard/finance']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/dashboard" element={<DashboardLayout />}><Route path="finance" element={<FinancePage />} /></Route></Routes></MemoryRouter></QueryClientProvider>)
  await screen.findByRole('heading', { name: 'Finanzas' })
  expect(useAuthStore.getState().tenantRole).toBe('OWNER')
  expect(screen.getByRole('link', { name: 'Finanzas' })).toBeTruthy()
  expect(requests[0].url).toBe('/tenants/me')
})

it('el alta requiere contrato y reintenta una operación atómica sin crear por separado', async () => {
  failContract = true
  const { user } = setup(<ProfessionalsPage />)
  await user.click(screen.getByRole('button', { name: 'Agregar al equipo' }))
  await user.type(screen.getByLabelText('Nombre del profesional'), 'Ana')
  expect(screen.queryByRole('radio', { name: /Configurar más adelante/ })).toBeNull()
  await user.clear(screen.getByLabelText('Porcentaje del profesional'))
  await user.type(screen.getByLabelText('Porcentaje del profesional'), '40')
  await user.click(screen.getByRole('button', { name: 'Crear profesional y contrato' }))
  await screen.findByText('No se pudo guardar el contrato')
  expect(createdProfessional).toBe(false)
  expect((screen.getByLabelText('Porcentaje del profesional') as HTMLInputElement).value).toBe('40')
  failContract = false
  await user.click(screen.getByRole('button', { name: 'Crear profesional y contrato' }))
  await screen.findByText('El equipo se actualizó correctamente.')
  const writes = requests.filter((r) => r.method === 'post' && r.url === '/professionals')
  expect(writes).toHaveLength(2)
  expect(writes[0].headers.get('Idempotency-Key')).toBe(writes[1].headers.get('Idempotency-Key'))
  expect(JSON.parse(writes[1].data)).toMatchObject({ contract: { contractType: 'percentage', value: '40', isActive: true } })
  expect(requests.filter((r) => r.method === 'post' && r.url === '/finance/contracts')).toHaveLength(0)
  await user.click(await screen.findByRole('button', { name: 'Editar Ana' }))
  expect((screen.getByRole('button', { name: 'Cerrar ventana' }) as HTMLButtonElement).disabled).toBe(false)
})
it('OWNER asigna ADMIN a una cuenta sin crear un profesional ni contrato', async () => {
  const { user } = setup(<ProfessionalsPage />)
  await user.click(screen.getByRole('button', { name: 'Agregar al equipo' }))
  await user.click(screen.getByRole('radio', { name: 'ADMIN (administración)' }))
  expect(screen.queryByLabelText('Porcentaje del profesional')).toBeNull()
  await user.type(screen.getByLabelText('Nombre del administrador'), 'Admin QA')
  await user.type(screen.getByLabelText('Correo de la cuenta administradora'), 'admin@example.invalid')
  await user.click(screen.getByRole('button', { name: 'Asignar ADMIN' }))
  await screen.findByText('El equipo se actualizó correctamente.')
  expect(requests.find((r) => r.url === '/team/admins')!.headers.get('Idempotency-Key')).toMatch(/^[a-f0-9-]{36}$/)
  expect(JSON.parse(requests.find((r) => r.url === '/team/admins')!.data)).toEqual({ email: 'admin@example.invalid', fullName: 'Admin QA' })
  expect(requests.filter((r) => r.method === 'post' && (r.url === '/professionals' || r.url === '/finance/contracts'))).toHaveLength(0)
})
it('ADMIN no puede dar altas ni asignar roles y OWNER ve los roles reales del local', async () => {
  setup(<ProfessionalsPage />, 'ADMIN')
  await screen.findByText('Todavía no hay registros. Creá el primero para empezar.')
  expect(screen.queryByRole('button', { name: 'Agregar al equipo' })).toBeNull()
  expect(requests.filter((r) => r.url === '/team')).toHaveLength(0)
  cleanup(); client.clear()
  setup(<ProfessionalsPage />)
  await screen.findByText('Propietario QA')
  expect(screen.getByText('Cuentas y roles del local')).toBeTruthy()
  expect(screen.getByText('Propietario')).toBeTruthy()
})

it('ADMIN sólo ve activos, no puede dar bajas ni modificar acceso o estado, y guarda sólo el nombre', async () => {
  createdProfessional = true
  const original = api.defaults.adapter as import('axios').AxiosAdapter
  api.defaults.adapter = async (config) => {
    const response = await original(config)
    if (config.url === '/professionals' && config.method === 'get') response.data = { professionals: [professional, { ...professional, id: other, display_name: 'Inactivo QA', is_active: false }] }
    return response
  }
  const { user } = setup(<ProfessionalsPage />, 'ADMIN')
  await screen.findByRole('button', { name: 'Editar Ana' })
  expect(screen.queryByLabelText('Mostrar')).toBeNull()
  expect(screen.queryByText('Inactivo QA')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Eliminar Ana' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Configurar horarios de Ana' })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Editar Ana' }))
  expect((screen.getByLabelText('ID de usuario (opcional)') as HTMLInputElement).disabled).toBe(true)
  expect(screen.queryByLabelText('Profesional activo')).toBeNull()
  await user.clear(screen.getByLabelText('Nombre del profesional'))
  await user.type(screen.getByLabelText('Nombre del profesional'), 'Ana actualizada')
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await screen.findByText('Los cambios se guardaron correctamente.')
  expect(JSON.parse(requests.find((r) => r.url === `/professionals/${id}` && r.method === 'patch')!.data)).toEqual({ displayName: 'Ana actualizada' })
})
