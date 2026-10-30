import { Skeleton } from './Skeleton'
import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'danger'; busy?: boolean }
export function Button({ variant = 'secondary', busy = false, disabled, children, className = '', type = 'button', ...props }: Props) {
  return <button {...props} type={type} disabled={busy || disabled} aria-busy={busy} className={`${variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-secondary'} ${className}`}>
    {busy && <Skeleton className="h-4 w-4 shrink-0 rounded" />}{children}
  </button>
}
