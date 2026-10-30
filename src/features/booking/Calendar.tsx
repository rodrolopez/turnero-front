import { useState } from 'react'
import { addMonths, format, getDaysInMonth, getISODay, parseISO, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { readableDate } from './utils'

export function BookingCalendar({ today, value, onChange }: { today: string; value: string; onChange: (date: string) => void }) {
  const [month, setMonth] = useState(() => startOfMonth(parseISO(value || today)))
  const monthKey = format(month, 'yyyy-MM')
  const offset = getISODay(month) - 1
  return <section aria-label="Calendario de reservas" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="mb-5 flex items-center justify-between gap-3"><Button aria-label="Mes anterior" disabled={monthKey <= today.slice(0, 7)} onClick={() => setMonth((current) => addMonths(current, -1))}><ChevronLeft size={17} /></Button><h3 className="font-semibold capitalize" aria-live="polite">{format(month, 'MMMM yyyy', { locale: es })}</h3><Button aria-label="Mes siguiente" onClick={() => setMonth((current) => addMonths(current, 1))}><ChevronRight size={17} /></Button></div>
    <div className="grid grid-cols-7 gap-1.5 text-center">{['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((day) => <span key={day} className="pb-2 text-xs font-medium text-slate-400" aria-hidden="true">{day}</span>)}
      {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
      {Array.from({ length: getDaysInMonth(month) }, (_, index) => {
        const day = index + 1
        const date = `${monthKey}-${String(day).padStart(2, '0')}`
        return <button type="button" key={date} aria-label={readableDate(date)} aria-pressed={value === date} aria-current={today === date ? 'date' : undefined} disabled={date < today} onClick={() => onChange(date)} className={`flex min-h-11 items-center justify-center rounded-xl text-sm font-medium transition disabled:cursor-default disabled:text-slate-300 ${value === date ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-700 hover:bg-teal-50 disabled:hover:bg-transparent'} ${today === date && value !== date ? 'ring-1 ring-inset ring-teal-600' : ''}`}>{day}</button>
      })}
    </div>
    <p className="mt-4 text-xs leading-relaxed text-slate-500">Elegí un día para consultar los horarios. La disponibilidad puede cambiar hasta completar la reserva.</p>
  </section>
}
