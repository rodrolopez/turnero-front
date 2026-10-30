import { Skeleton, SkeletonScreen } from '../../components/ui/Skeleton'

export function TimeGridSkeleton({ columns = 3, label = 'Cargando agenda…' }: { columns?: number; label?: string }) {
  const count = Math.max(1, columns)
  return <SkeletonScreen label={label}><div className="max-h-[70vh] overflow-hidden rounded-2xl border border-slate-200 bg-white"><div style={{ minWidth: 64 + count * 170, gridTemplateColumns: `64px repeat(${count}, minmax(170px, 1fr))` }} className="grid">
    <div className="border-b border-r border-slate-200 bg-slate-50 p-3"><Skeleton className="h-5 w-8" /></div>
    {Array.from({ length: count }, (_, column) => <div key={column} className="space-y-2 border-b border-r border-slate-200 bg-slate-50 p-4"><Skeleton className="mx-auto h-4 w-24" /><Skeleton className="mx-auto h-3 w-12" /></div>)}
    <div className="border-r border-slate-200">{Array.from({ length: 7 }, (_, hour) => <div key={hour} className="h-24 px-3 pt-2"><Skeleton className="h-3 w-9" /></div>)}</div>
    {Array.from({ length: count }, (_, column) => <div key={column} className="relative border-r border-slate-200">{Array.from({ length: 7 }, (_, hour) => <div key={hour} className="h-24 border-b border-slate-100" />)}<Skeleton className="absolute inset-x-2 h-20 rounded-lg" style={{ top: 30 + column % 3 * 72 }} /><Skeleton className="absolute inset-x-2 h-32 rounded-lg" style={{ top: 340 - column % 3 * 48 }} /></div>)}
  </div></div></SkeletonScreen>
}
