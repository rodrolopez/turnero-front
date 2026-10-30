import { useId, type InputHTMLAttributes } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string; hint?: string }
export function Field({ label, error, hint, id, ...props }: FieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return <div className="space-y-1.5">
    <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">{label}</label>
    <input {...props} id={inputId} aria-invalid={Boolean(error)} aria-describedby={error || hint ? `${inputId}-help` : undefined} className="input" />
    {(error || hint) && <p id={`${inputId}-help`} className={`text-xs ${error ? 'text-red-600' : 'text-slate-500'}`}>{error ?? hint}</p>}
  </div>
}
