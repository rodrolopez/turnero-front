import { CardsSkeleton } from './ui/Skeleton'

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return <CardsSkeleton label={label} />
}
export function ErrorMessage({ message }: { message?: string }) {
  return message ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</p> : null
}
