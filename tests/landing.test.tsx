// @vitest-environment jsdom
import { beforeEach, afterEach, it, expect } from 'vitest'
import { cleanup, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LandingPage from '../src/pages/LandingPage'
import { AuthPage } from '../src/pages/AuthPage'
import { useAuthStore } from '../src/stores/useAuthStore'
import App from '../src/App'
let client: QueryClient
beforeEach(() => { useAuthStore.getState().logout(); client = new QueryClient({ defaultOptions: { queries: { retry: false } } }) })
afterEach(() => { cleanup(); client.clear(); useAuthStore.getState().logout(); window.history.replaceState({}, '', '/') })
function setup(path = '/') {
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]} future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Routes><Route path="/" element={<LandingPage />} /><Route path="register" element={<AuthPage mode="register" />} /><Route path="login" element={<AuthPage mode="login" />} /></Routes></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}
it('la raíz de la aplicación abre la landing pública y conserva el acceso a ingresar', async () => {
  window.history.replaceState({}, '', '/')
  render(<QueryClientProvider client={client}><App /></QueryClientProvider>)
  await screen.findByRole('heading', { level:1, name: 'Hacé lugar para crecer.' })
  expect(screen.getAllByRole('link', { name: 'Ingresar' })[0].getAttribute('href')).toBe('/login')
  expect(screen.getAllByRole('heading', {level:1})).toHaveLength(1)
  await waitFor(() => expect(document.title).toContain('AR$ 5.000 al mes'))
})
it.each([['Agenda','agenda','5.000','Empezar con Agenda'],['Integral','integral','10.000','Elegir Integral']])('el CTA de %s lleva al registro con su precio mensual', async (name, id, price, label) => {
  const user=setup()
  expect(screen.getByRole('link',{name:label}).getAttribute('href')).toBe(`/register?plan=${id}`)
  await user.click(screen.getByRole('link',{name:label}))
  expect(screen.getByRole('heading',{name:'Creá tu cuenta'})).toBeTruthy()
  expect(screen.getByText(`Plan ${name} · AR$ ${price} / mes`)).toBeTruthy()
  expect(screen.getByText(/Este registro crea tu cuenta y no realiza un cobro automático/)).toBeTruthy()
  await user.click(screen.getByRole('link',{name:'Ingresá',exact:true}))
  expect(screen.getByRole('link',{name:'Registrate'}).getAttribute('href')).toBe(`/register?plan=${id}`)
})
it('el plan Agenda ofrece los módulos acordados y las funciones de equipo están en Integral', () => {
  setup()
  const basic=screen.getByRole('heading',{name:'Agenda',exact:true}).closest('article')!
  const complete=screen.getByRole('heading',{name:'Integral',exact:true}).closest('article')!
  for(const feature of ['Agenda de turnos','Catálogo de servicios','Configuración de Mi empresa']) expect(within(basic).getByText(feature)).toBeTruthy()
  expect(within(basic).queryByText('Contratos, saldos y liquidaciones')).toBeNull()
  expect(within(complete).getByText('Contratos, saldos y liquidaciones')).toBeTruthy()
  expect(within(complete).getByText('Estadísticas de ventas y reservas')).toBeTruthy()
})
it('el menú móvil abre, cierra y sus enlaces llegan a las secciones reales',async()=>{
  const user=setup()
  const toggle=screen.getByRole('button',{name:'Abrir menú'})
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  await user.click(toggle)
  const nav=screen.getByRole('navigation',{name:'Navegación móvil'})
  expect(screen.getByRole('button',{name:'Cerrar menú'}).getAttribute('aria-expanded')).toBe('true')
  const link=within(nav).getByRole('link',{name:'Planes y precios'})
  expect(document.querySelector(link.getAttribute('href')!)).toBeTruthy()
  await user.click(link)
  expect(screen.queryByRole('navigation',{name:'Navegación móvil'})).toBeNull()
})
it('las preguntas se pueden desplegar y no se anuncian resultados publicitarios inexistentes',async()=>{
  const user=setup()
  const summary=screen.getByText('¿Las estadísticas me ayudan a evaluar mi publicidad?',{selector:'summary'})
  await user.click(summary)
  expect(summary.closest('details')?.open).toBe(true)
  expect(within(summary.closest('details')!).getByText(/Por ahora no atribuye reservas a una campaña específica/)).toBeTruthy()
})
it('ignora planes desconocidos al abrir el registro',()=>{
  setup('/register?plan=otro')
  expect(screen.queryByText(/Plan otro/)).toBeNull()
  expect(screen.getByRole('heading',{name:'Creá tu cuenta'})).toBeTruthy()
})
it('una sesión existente tiene acceso a su cuenta desde la landing',()=>{
  useAuthStore.setState({accessToken:'test'})
  setup()
  expect(screen.getAllByRole('link',{name:'Mi cuenta'})[0].getAttribute('href')).toBe('/tenants')
})
