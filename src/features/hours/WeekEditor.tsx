import { Plus, Trash2 } from 'lucide-react'
import { days } from './schemas'
import { Button } from '../../components/ui/Button'
import type { ReactNode } from 'react'

export function WeekEditor({ rows, renderRow, onAdd, onRemove, disabled, addDisabled, limit }: {
  rows: { id: string; weekday: number }[]
  renderRow: (index: number, label: string) => ReactNode
  onAdd: (weekday: number) => void
  onRemove: (index: number) => void
  disabled?: boolean
  addDisabled?: boolean
  limit: number
}) {
  return <div className="space-y-3">{days.map((day) => {
    const entries = rows.map((row, index) => ({ ...row, index })).filter((row) => row.weekday === day.value)
    return <section key={day.value} className="rounded-xl border border-slate-200 p-4" aria-label={day.label}><div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{day.label}</h3><Button disabled={disabled || addDisabled || rows.length >= limit} onClick={() => onAdd(day.value)} aria-label={`Agregar tramo el ${day.label.toLowerCase()}`}><Plus size={14} />Agregar tramo</Button></div>
      {!entries.length && <p className="text-xs text-slate-500">Sin atención</p>}
      <div className="space-y-3">{entries.map((row) => <div key={row.id} className="flex items-start gap-2"><div className="min-w-0 flex-1">{renderRow(row.index, day.label)}</div><Button className="mt-6" disabled={disabled} onClick={() => onRemove(row.index)} aria-label={`Quitar tramo ${day.label.toLowerCase()} ${entries.findIndex((entry) => entry.id === row.id) + 1}`}><Trash2 size={15} /></Button></div>)}</div>
    </section>
  })}</div>
}
