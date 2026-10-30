import { CardsSkeleton, Skeleton, SkeletonScreen } from '../../components/ui/Skeleton'

export function BookingSkeleton() {
  return <div className="mx-auto max-w-4xl"><SkeletonScreen label="Preparando tu próxima visita…" className="mb-7"><Skeleton className="mx-auto h-3 w-28" /><Skeleton className="mx-auto mt-4 h-9 w-2/3" /><Skeleton className="mx-auto mt-3 h-4 w-48" /></SkeletonScreen><div className="card !p-5 sm:!p-8"><div aria-hidden="true" className="mb-7 grid grid-cols-4 gap-3 border-b border-slate-100 pb-6">{Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-2"><Skeleton className="mx-auto h-8 w-8 rounded-full" /><Skeleton className="mx-auto h-3 w-12" /></div>)}</div><CardsSkeleton label="Cargando sucursales, servicios y profesionales…" count={6} /></div></div>
}

export function AvailabilitySkeleton() {
  return <SkeletonScreen label="Buscando tu próximo turno…"><Skeleton className="mb-4 h-3 w-32" /><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{Array.from({ length: 12 }, (_, index) => <Skeleton key={index} className="h-12 rounded-xl" />)}</div></SkeletonScreen>
}
