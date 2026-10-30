// @vitest-environment jsdom
import { beforeEach, afterEach, it, expect } from 'vitest'
import { render, cleanup, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom'
import type { InternalAxiosRequestConfig } from 'axios'
import StatisticsPage from '../src/pages/StatisticsPage'
import { api } from '../src/api/client'
import { useAuthStore } from '../src/stores/useAuthStore'
import { reportSchema, type StatisticsReport } from '../src/features/statistics/api'
const id = '11111111-1111-4111-8111-111111111111', second = '22222222-2222-4222-8222-222222222222'
const tenant = { id,name:'Empresa QA',slug:'empresa-qa',timezone:'America/Argentina/Buenos_Aires',role:'OWNER',status:'active',slotIntervalMinutes:15 }
let client: QueryClient
let malformed = false, empty = false
const requests: InternalAxiosRequestConfig[] = []
function report(): StatisticsReport {
  return {
    timezone:tenant.timezone,
    summary:{ services:empty ? 0 : 3,revenue:'35.25',cashRevenue:'7.00',reservations:4,webReservations:3 },
    previous:{ startDate:'2030-01-01',endDate:'2030-01-01',services:1,revenue:'10.00',reservations:2,webReservations:1 },
    services:[{ id,name:'Corte',isActive:true,quantity:empty ? 0 : 3,revenue:'35.25' },{ id:second,name:'Barba',isActive:true,quantity:0,revenue:'0' }],
    professionals:[{ id,name:'Ana',isActive:true,quantity:3,revenue:'35.25' },{ id:second,name:'Luis',isActive:true,quantity:0,revenue:'0.00' }],
    weekdays:Array.from({length:7},(_,i)=>({ weekday:i+1,quantity:!empty && i===2 ? 3 : 0,revenue:'0.00' })),
    daily:[{ date:'2030-01-02',quantity:3,revenue:'35.25',cashRevenue:'7.00',reservations:4,webReservations:3 }],
    serviceWeekdays:[{serviceId:id,weekday:3,quantity:3}],
    bookingHeatmap:Array.from({length:168},(_,i)=>({ weekday:Math.floor(i/24)+1,hour:i%24,total:!empty && i===66 ? 4 : 0,web:!empty && i===66 ? 3 : 0,walkIn:!empty && i===66 ? 1 : 0,cancelled:0 })),
  }
}
beforeEach(() => {
  malformed = false; empty = false; requests.length = 0
  useAuthStore.setState({ accessToken:'test',tenantId:id,tenantRole:'OWNER',user:{id,email:'owner@example.invalid',fullName:'Owner'} })
  api.defaults.adapter = async (config) => {
    requests.push(config)
    let data: unknown
    if (config.url === '/statistics') data = malformed ? { ...report(),summary:{...report().summary,revenue:35.25} } : report()
    else if (config.url === '/branches') data = {branches:[{id,name:'Centro',timezone:tenant.timezone,address:null,is_active:true}]}
    else if (config.url === '/services') data = {services:[{id,name:'Corte',duration_minutes:30,price:'10.00',is_active:true}]}
    else if (config.url === '/professionals') data = {professionals:[{id,display_name:'Ana',user_id:null,is_active:true}]}
    else throw new Error('Unexpected request')
    return {config,data,status:200,statusText:'OK',headers:{}}
  }
})
afterEach(()=>{cleanup();client?.clear();useAuthStore.getState().logout()})
function setup(role:'OWNER'|'STAFF'|'ADMIN'='OWNER') {
  useAuthStore.setState({tenantRole:role})
  client = new QueryClient({defaultOptions:{queries:{retry:false}}})
  render(<QueryClientProvider client={client}><MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Routes><Route element={<Outlet context={{...tenant,role}}/>}><Route index element={<StatisticsPage/>}/></Route></Routes></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}
it('OWNER ve ventas, demanda por hora y rankings con ceros, y puede ordenar de menor a mayor', async()=>{
  const user=setup()
  await screen.findByRole('heading',{name:'¿Cuándo deciden reservar?'})
  expect(screen.getByText(/Mayor actividad: Miércoles, 18:00/)).toBeTruthy()
  expect(screen.getByText(/no atribuye ventas a campañas/)).toBeTruthy()
  const services=screen.getByRole('heading',{name:'Servicios',exact:true}).closest('section')!
  await user.selectOptions(screen.getByLabelText('Ordenar servicios'),'least')
  const rows=within(services).getAllByRole('row')
  expect(within(rows[1]).getByText('Barba')).toBeTruthy()
  expect(within(rows[2]).getByText('Corte')).toBeTruthy()
  await user.selectOptions(screen.getByLabelText('Origen de las reservas'),'walkIn')
  expect(screen.getByText(/18:00–18:59 · 1 reservas/)).toBeTruthy()
  const key=client.getQueryCache().getAll().find(query=>query.queryKey[0]==='statistics')!.queryKey
  expect(key.slice(0,4)).toEqual(['statistics',id,'OWNER',id])
})
it('los filtros se aplican explícitamente y validan el rango antes de consultar',async()=>{
  const user=setup()
  await screen.findByRole('heading',{name:'¿Cuándo deciden reservar?'})
  await user.clear(screen.getByLabelText('Desde'));await user.type(screen.getByLabelText('Desde'),'2030-01-01')
  await user.clear(screen.getByLabelText('Hasta'));await user.type(screen.getByLabelText('Hasta'),'2030-01-02')
  await user.selectOptions(screen.getByLabelText('Sucursal'),id)
  await user.selectOptions(screen.getByLabelText('Profesional'),id)
  await user.selectOptions(screen.getByLabelText('Servicio'),id)
  expect(requests.filter(r=>r.url==='/statistics')).toHaveLength(1)
  await user.click(screen.getByRole('button',{name:'Aplicar filtros'}))
  await waitFor(()=>expect(requests.filter(r=>r.url==='/statistics')).toHaveLength(2))
  expect(requests.filter(r=>r.url==='/statistics')[1].params).toEqual({startDate:'2030-01-01',endDate:'2030-01-02',branchId:id,professionalId:id,serviceId:id})
  await user.clear(screen.getByLabelText('Hasta'));await user.type(screen.getByLabelText('Hasta'),'2029-12-31')
  await user.click(screen.getByRole('button',{name:'Aplicar filtros'}))
  await screen.findByText('Elegí un período ordenado de hasta 366 días')
  expect(requests.filter(r=>r.url==='/statistics')).toHaveLength(2)
})
it.each(['ADMIN','STAFF'] as const)('%s no monta filtros ni realiza consultas estadísticas',async(role)=>{
  setup(role)
  expect(screen.getByText('Estadísticas está disponible sólo para el propietario.')).toBeTruthy()
  expect(requests).toHaveLength(0)
})
it('informa períodos sin reservas sin inventar una hora pico',async()=>{
  empty=true;setup()
  await screen.findByText('No hay reservas de este origen en el período.')
  expect(screen.queryByText(/Mayor actividad:/)).toBeNull()
})
it('rechaza importes de formato inesperado sin mostrar datos financieros inválidos',async()=>{
  malformed=true;setup()
  await screen.findByText(/Recibimos una respuesta inesperada/)
  expect(screen.queryByRole('heading',{name:'¿Cuándo deciden reservar?'})).toBeNull()
})
it('valida los ceros decimales devueltos por PostgreSQL',()=>{
  expect(reportSchema.safeParse(report()).success).toBe(true)
})
