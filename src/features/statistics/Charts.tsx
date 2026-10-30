import { useState } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { money } from '../finance/utils'
import type { Ranking, StatisticsReport } from './api'
export const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export function RankingTable({ title, rows }: { title: string; rows: Ranking[] }) {
  const [order, setOrder] = useState('most')
  const sorted = [...rows].sort((a, b) => {
    if (order === 'revenue') {
      const cents = (value: string) => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')) }
      const difference = cents(b.revenue) - cents(a.revenue)
      return difference > 0n ? 1 : difference < 0n ? -1 : a.name.localeCompare(b.name)
    }
    return (order === 'least' ? a.quantity - b.quantity : b.quantity - a.quantity) || a.name.localeCompare(b.name)
  })
  return <section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><h2 className="text-xl font-semibold">{title}</h2><label className="text-sm">Ordenar {title.toLocaleLowerCase('es')}<select className="input mt-2" value={order} onChange={(event) => setOrder(event.target.value)}><option value="most">Más servicios</option><option value="least">Menos servicios</option><option value="revenue">Mayor facturación</option></select></label></div><DataTable rows={sorted} empty="No hay registros para estos filtros." columns={[
    { title: 'Nombre', render: (row) => <><span className="font-medium">{row.name}</span>{!row.isActive && <span className="ml-2 text-xs text-slate-400">Inactivo</span>}</> },
    { title: 'Servicios realizados', render: (row) => row.quantity },
    { title: 'Facturación', render: (row) => money(row.revenue) },
  ]} /></section>
}
export function BookingHeatmap({ cells }: { cells: StatisticsReport['bookingHeatmap'] }) {
  const [source, setSource] = useState<'web' | 'total' | 'walkIn'>('web')
  const max = Math.max(0, ...cells.map((cell) => cell[source]))
  const peak = cells.find((cell) => max > 0 && cell[source] === max)
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">¿Cuándo deciden reservar?</h2><p className="mt-2 max-w-2xl text-sm text-slate-500">Momento de creación de la reserva, según la hora local del informe. Cada reserva cuenta una vez, aunque incluya varios servicios. Incluye las que después se cancelaron o vencieron.</p></div><label className="text-sm">Origen de las reservas<select className="input mt-2" value={source} onChange={(event) => setSource(event.target.value as typeof source)}><option value="web">Reservas online</option><option value="total">Todos los orígenes</option><option value="walkIn">Turnos directos</option></select></label></div>
    <p role="status" className="text-sm font-medium text-teal-800">{peak ? `Mayor actividad: ${weekdays[peak.weekday - 1]}, ${String(peak.hour).padStart(2, '0')}:00–${String(peak.hour).padStart(2, '0')}:59 · ${max} reservas${cells.filter((cell) => cell[source] === max).length > 1 ? ' (hay horarios empatados)' : ''}.` : 'No hay reservas de este origen en el período.'}</p>
    <div className="overflow-x-auto"><table className="w-full min-w-[1050px] border-separate border-spacing-1 text-center text-xs"><caption className="sr-only">Reservas creadas por día de la semana y hora</caption><thead><tr><th scope="col" className="text-left">Día / hora</th>{Array.from({ length: 24 }, (_, hour) => <th scope="col" key={hour} className="font-normal text-slate-500">{String(hour).padStart(2, '0')}</th>)}</tr></thead><tbody>{weekdays.map((day, index) => <tr key={day}><th scope="row" className="pr-3 text-left font-medium">{day}</th>{Array.from({ length: 24 }, (_, hour) => {
      const cell = cells.find((value) => value.weekday === index + 1 && value.hour === hour)
      const count = cell?.[source] ?? 0
      const intensity = max ? count / max : 0
      return <td key={hour} title={`${day} ${String(hour).padStart(2, '0')}:00: ${count} reservas`} className={`h-9 min-w-8 rounded-md tabular-nums ${count === 0 ? 'bg-slate-50 text-slate-400' : intensity > .66 ? 'bg-teal-700 text-white' : intensity > .33 ? 'bg-teal-300 text-teal-950' : 'bg-teal-100 text-teal-900'}`}>{count}</td>
    })}</tr>)}</tbody></table></div><p className="text-xs text-slate-500">Más intensidad indica más reservas. Permite observar picos después de una publicidad; no atribuye ventas a campañas ni mide conversión, porque todavía no registramos campañas ni visitas.</p>
  </section>
}
export function ServiceWeekdays({ report }: { report: StatisticsReport }) {
  return <section className="space-y-4"><h2 className="text-xl font-semibold">Servicios vendidos por día de atención</h2><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[700px] text-sm"><caption className="sr-only">Cantidad de servicios realizados y cobrados por día de la semana</caption><thead className="bg-slate-50 text-slate-500"><tr><th scope="col" className="p-4 text-left">Servicio</th>{weekdays.map((day) => <th scope="col" className="p-3" key={day}>{day.slice(0, 3)}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{report.services.map((service) => <tr key={service.id}><th scope="row" className="p-4 text-left font-medium">{service.name}</th>{weekdays.map((day, index) => <td key={day} className="p-3 text-center tabular-nums">{report.serviceWeekdays.find((cell) => cell.serviceId === service.id && cell.weekday === index + 1)?.quantity ?? 0}</td>)}</tr>)}{!report.services.length && <tr><td colSpan={8} className="p-5 text-slate-500">No hay servicios para estos filtros.</td></tr>}</tbody></table></div></section>
}
