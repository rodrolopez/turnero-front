import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

export function ChoiceCard({ name, value, checked, onChange, children, featured = false }: { name: string; value: string; checked: boolean; onChange: () => void; children: ReactNode; featured?: boolean }) {
  return <label className={`relative flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition focus-within:ring-2 focus-within:ring-teal-600 focus-within:ring-offset-2 sm:p-5 ${checked ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-600' : featured ? 'border-teal-200 bg-teal-50/30 hover:border-teal-500' : 'border-slate-200 bg-white hover:border-teal-400'}`}>
    <input type="radio" className="sr-only" name={name} value={value} checked={checked} onChange={onChange} />
    <div className="min-w-0 flex-1">{children}</div><span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${checked ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300'}`}>{checked && <Check size={13} />}</span>
  </label>
}
