import { FinanceNavigation } from '../features/finance/FinanceNavigation'
import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { RefreshCw, Wallet } from 'lucide-react'
import type { Tenant } from '../lib/schemas'
import { useAuthStore } from '../stores/useAuthStore'
import { useBalances, usePersonalTransactions, useSummary, useTransactions } from '../features/finance/api'
import type { Balance, PersonalTransaction, Transaction } from '../features/finance/schemas'
import { money } from '../features/finance/utils'
import { PayoutModal, VoidModal } from '../features/finance/LedgerModals'
import { DataTable, type Column } from '../components/ui/DataTable'
import { CardsSkeleton, TableSkeleton } from '../components/ui/Skeleton'
import { QueryError } from '../components/ui/QueryState'
import { Button } from '../components/ui/Button'

function Pagination({ offset, total, busy, onChange }: { offset: number; total: number; busy: boolean; onChange: (value: number) => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{total ? offset + 1 : 0}–{Math.min(offset + 50, total)} de {total} movimientos</p><div className="flex gap-2"><Button disabled={busy || offset === 0} onClick={() => onChange(Math.max(0, offset - 50))}>Anterior</Button><Button disabled={busy || offset + 50 >= total} onClick={() => onChange(offset + 50)}>Siguiente</Button></div></div>
}
function Status({ status }: { status: 'completed' | 'voided' }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${status === 'completed' ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>{status === 'completed' ? 'Vigente' : 'Anulado'}</span>
}
function dateTime(value: string, timezone: string) { return new Intl.DateTimeFormat('es-AR', { timeZone: timezone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }
export default function FinancePage() {
  const role = useAuthStore((state) => state.tenantRole)
  if (role === 'OWNER') return <div className="space-y-6"><FinanceNavigation /><OwnerFinance /></div>
  if (role === 'STAFF') return <StaffFinance />
  return <section className="card"><h1 className="text-2xl font-semibold">Finanzas</h1><p className="mt-4 text-sm text-slate-600">Tu rol no tiene acceso al historial financiero. Podés gestionar cobros desde la Agenda si tenés permisos de caja.</p></section>
}
function OwnerFinance() {
  const tenant = useOutletContext<Tenant>()
  const summary = useSummary(), balances = useBalances()
  const [offset, setOffset] = useState(0), [professionalId, setProfessionalId] = useState('')
  const transactions = useTransactions(offset, professionalId)
  const [paying, setPaying] = useState<Balance | null>(null), [voiding, setVoiding] = useState<Transaction | null>(null)
  const [notice, setNotice] = useState('')
  const names = new Map(balances.data?.map((b) => [b.professionalId, b.name]))
  const balanceColumns: Column<Balance & { id: string }>[] = [
    { title: 'Profesional', render: (b) => <span className="font-semibold">{b.name}</span> },
    { title: 'Saldo', render: (b) => <span className={`font-semibold tabular-nums ${b.balance.startsWith('-') ? 'text-amber-800' : 'text-teal-800'}`}>{money(b.balance)}</span> },
    { title: 'Situación', render: (b) => Number(b.balance) === 0 ? 'Al día' : b.balance.startsWith('-') ? 'Deuda con el local' : 'A pagar al profesional' },
    { title: 'Acciones', render: (b) => Number(b.balance) !== 0 ? <Button onClick={() => { setNotice(''); setPaying(b) }}>{b.balance.startsWith('-') ? 'Registrar cobro de deuda' : 'Registrar Pago'}</Button> : <span className="text-xs text-slate-400">Sin saldo pendiente</span> },
  ]
  const columns: Column<Transaction>[] = [
    { title: 'Fecha', render: (t) => <span className="whitespace-nowrap">{dateTime(t.created_at, tenant.timezone)}</span> },
    { title: 'Profesional', render: (t) => names.get(t.professional_id) ?? t.professional_id },
    { title: 'Bruto', render: (t) => money(t.total_amount) }, { title: 'Local', render: (t) => money(t.business_earnings) },
    { title: 'Ganancia profesional', render: (t) => money(t.professional_earnings) },
    { title: 'Medio', render: (t) => t.payment_method === 'cash' ? 'Efectivo' : 'Mercado Pago' },
    { title: 'Estado', render: (t) => <Status status={t.status} /> },
    { title: 'Acciones', render: (t) => t.status === 'completed' ? <Button onClick={() => { setNotice(''); setVoiding(t) }}>Anular</Button> : '—' },
  ]
  return <div className="space-y-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">CONTROL FINANCIERO</p><h1 className="mt-3 text-3xl font-semibold">Finanzas</h1><p className="mt-2 text-sm text-slate-500">Facturación y cuentas corrientes de {tenant.name}.</p></div><Button busy={summary.isFetching || balances.isFetching || transactions.isFetching} onClick={() => { void summary.refetch(); void balances.refetch(); void transactions.refetch() }}><RefreshCw size={16} />Actualizar</Button></div>
    {notice && <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">{notice}</p>}
    {summary.isPending ? <CardsSkeleton label="Cargando resumen financiero…" /> : summary.isError ? <QueryError error={summary.error} retry={() => void summary.refetch()} /> : <section aria-label="Resumen global" className="grid gap-4 sm:grid-cols-3">{[{ label: 'Bruto total', value: summary.data.totalAmount }, { label: 'Ganancias del local', value: summary.data.businessEarnings }, { label: 'Ganancias profesionales', value: summary.data.professionalEarnings }].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{item.label}</p><p className="mt-3 break-words text-2xl font-semibold tracking-tight text-teal-900">{money(item.value)}</p><p className="mt-2 text-xs text-slate-400">Acumulado histórico de cobros vigentes</p></div>)}</section>}
    <section className="space-y-4" aria-label="Cuentas corrientes"><div><h2 className="text-xl font-semibold">Cuentas corrientes</h2><p className="mt-2 text-sm text-slate-500">Saldo positivo: a pagar al profesional. Saldo negativo: deuda con el local.</p></div>{balances.isPending ? <TableSkeleton columns={balanceColumns} label="Cargando saldos…" /> : balances.isError ? <QueryError error={balances.error} retry={() => void balances.refetch()} /> : <DataTable rows={balances.data.map((b) => ({ ...b, id: b.professionalId }))} columns={balanceColumns} empty="Todavía no hay profesionales con cuentas corrientes." />}</section>
    <section className="space-y-4" aria-label="Historial global de transacciones"><div className="flex flex-wrap items-end justify-between gap-4"><h2 className="text-xl font-semibold">Historial de transacciones</h2><div><label htmlFor="finance-professional" className="mb-2 block text-sm font-medium">Filtrar profesional</label><select id="finance-professional" className="input" value={professionalId} onChange={(e) => { setProfessionalId(e.target.value); setOffset(0) }}><option value="">Todos los profesionales</option>{balances.data?.map((b) => <option key={b.professionalId} value={b.professionalId}>{b.name}</option>)}</select></div></div>{transactions.isPending ? <TableSkeleton columns={columns} label="Cargando transacciones…" /> : transactions.isError ? <QueryError error={transactions.error} retry={() => void transactions.refetch()} /> : <><DataTable rows={transactions.data.entries} columns={columns} empty="No hay transacciones para este filtro." /><Pagination offset={offset} total={transactions.data.pagination.total} busy={transactions.isFetching} onChange={setOffset} /></>}</section>
    {paying && <PayoutModal balance={paying} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); setNotice('Pago registrado. Las cuentas corrientes están actualizadas.') }} />}
    {voiding && <VoidModal transaction={voiding} onClose={() => setVoiding(null)} onSaved={(refund) => { setVoiding(null); setNotice(refund ? 'Anulación contable registrada. Falta gestionar el reembolso en Mercado Pago.' : 'Cobro anulado. Se compensaron los saldos y el turno quedó pendiente de pago.') }} />}
  </div>
}
function StaffFinance() {
  const tenant = useOutletContext<Tenant>()
  const balances = useBalances()
  const [selected, setSelected] = useState(''), [offset, setOffset] = useState(0)
  const professionalId = balances.data?.some((b) => b.professionalId === selected) ? selected : balances.data?.[0]?.professionalId ?? ''
  const current = balances.data?.find((b) => b.professionalId === professionalId)
  const transactions = usePersonalTransactions(offset, professionalId, Boolean(professionalId))
  const columns: Column<PersonalTransaction>[] = [
    { title: 'Fecha', render: (t) => dateTime(t.created_at, tenant.timezone) },
    { title: 'Mi ganancia', render: (t) => <span className={t.status === 'voided' ? 'text-slate-400 line-through' : 'font-semibold text-teal-800'}>{money(t.amount)}</span> },
    { title: 'Estado', render: (t) => <Status status={t.status} /> },
  ]
  return <div className="space-y-6"><div><p className="eyebrow">MI CUENTA</p><h1 className="mt-3 text-3xl font-semibold">Mis finanzas</h1><p className="mt-2 text-sm text-slate-500">Tus ganancias y tu saldo personal en {tenant.name}.</p></div>
    {balances.isPending ? <CardsSkeleton label="Cargando tu saldo…" /> : balances.isError ? <QueryError error={balances.error} retry={() => void balances.refetch()} /> : !current ? <div className="card"><Wallet className="text-teal-700" /><p className="mt-4 text-sm text-slate-600">Todavía no tenés un profesional vinculado a tu cuenta en esta empresa. Pedile al propietario que vincule tu usuario.</p></div> : <>
      {balances.data.length > 1 && <div><label htmlFor="my-finance-professional" className="mb-2 block text-sm font-medium">Mi perfil profesional</label><select id="my-finance-professional" className="input" value={professionalId} onChange={(e) => { setSelected(e.target.value); setOffset(0) }}>{balances.data.map((b) => <option key={b.professionalId} value={b.professionalId}>{b.name}</option>)}</select></div>}
      <div className="rounded-2xl border border-teal-200 bg-white p-6"><p className="text-sm text-slate-500">Saldo actual · {current.name}</p><p className="mt-3 text-3xl font-semibold text-teal-900">{money(current.balance)}</p><p className="mt-3 text-sm text-slate-500">{Number(current.balance) === 0 ? 'Tu cuenta está al día.' : current.balance.startsWith('-') ? 'Este importe corresponde a una deuda con el local.' : 'Este es el importe pendiente de cobrar al local.'}</p></div>
      <h2 className="text-xl font-semibold">Mi historial de transacciones</h2>{transactions.isPending ? <TableSkeleton columns={columns} label="Cargando tus movimientos…" /> : transactions.isError ? <QueryError error={transactions.error} retry={() => void transactions.refetch()} /> : transactions.data && <><DataTable rows={transactions.data.entries} columns={columns} empty="Todavía no tenés transacciones registradas." /><Pagination offset={offset} total={transactions.data.pagination.total} busy={transactions.isFetching} onChange={setOffset} /></>}
    </>}
  </div>
}
